// ============================================================
// BUSINESS DAY ENGINE — Single Source of Truth
// ============================================================
// This service is the ONLY read-path for financial data.
// All dashboards, reports, daily closing, master sheets,
// and cash books read from this service.
//
// It talks exclusively to Supabase. No localStorage.
// ============================================================

import { createClient } from '@/lib/supabase/client';
import { resolveCentreId } from '../utils/centre-resolver';
import type {
  BusinessDay,
  BusinessEvent,
  DayMetrics,
  MonthlyRegisterRow,
  CashBookEntry,
  GeneralLedgerEntry,
  TraceTransaction,
  DailyRegister,
  MonthlyRegisterMatrix,
} from '../types/business-day.types';

class BusinessDayEngine {
  private supabase = createClient();

  // ---- Core Read Operations ----

  /**
   * Get or create the business day for a specific centre and date.
   * Calls the `ensure_business_day` Postgres function which handles
   * opening cash chain from the previous day's closing.
   */
  async ensureBusinessDay(centreId: string, date: string): Promise<string> {
    if (!centreId || centreId === 'all' || centreId === 'Consolidated') {
      throw new Error('Cannot ensure business day for consolidated view. Must specify a centre ID.');
    }
    const resolvedId = resolveCentreId(centreId);
    const { data, error } = await this.supabase.rpc('ensure_business_day', {
      p_centre_id: resolvedId,
      p_date: date,
    });

    if (error) {
      console.error('[BusinessDayEngine] Failed to ensure business day:', error);
      throw new Error(`Failed to ensure business day: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Get the business day record for a centre and date.
   * Returns null if no business day exists yet.
   */
  async getBusinessDay(centreId: string, date: string): Promise<BusinessDay | null> {
    if (!centreId || centreId === 'all' || centreId === 'Consolidated') {
      return null;
    }
    const resolvedId = resolveCentreId(centreId);
    const { data, error } = await this.supabase
      .from('business_days')
      .select('*')
      .eq('centre_id', resolvedId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('[BusinessDayEngine] Failed to get business day:', error);
      return null;
    }

    return data as BusinessDay | null;
  }

  /**
   * Get today's metrics for the dashboard.
   * This is THE ONLY source of dashboard numbers.
   */
  async getTodayMetrics(centreId?: string | null): Promise<DayMetrics> {
    const today = new Date().toISOString().split('T')[0];
    
    if (!centreId || centreId === 'all' || centreId === 'Consolidated') {
      const allMetrics = await this.getAllCentresTodayMetrics();
      if (allMetrics.length === 0) return this.emptyMetrics();
      return this.aggregateMetrics(allMetrics.map(m => m.metrics));
    }

    const resolvedId = resolveCentreId(centreId);
    const day = await this.getBusinessDay(resolvedId, today);

    if (!day) {
      return this.emptyMetrics();
    }

    return this.businessDayToMetrics(day);
  }

  /**
   * Get the business day for today, creating it if needed.
   */
  async getOrCreateToday(centreId: string): Promise<BusinessDay> {
    const resolvedId = resolveCentreId(centreId);
    const today = new Date().toISOString().split('T')[0];
    await this.ensureBusinessDay(resolvedId, today);
    const day = await this.getBusinessDay(resolvedId, today);
    return day!;
  }

  // ---- Events (the audit trail of financial facts) ----

  /**
   * Get all business events for a specific business day.
   */
  async getBusinessDayEvents(businessDayId: string): Promise<BusinessEvent[]> {
    const { data, error } = await this.supabase
      .from('business_events')
      .select('*')
      .eq('business_day_id', businessDayId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BusinessDayEngine] Failed to get events:', error);
      return [];
    }

    return (data || []) as BusinessEvent[];
  }

  /**
   * Get all business events for a centre and date.
   */
  async getEventsForDate(centreId?: string | null, date?: string): Promise<BusinessEvent[]> {
    let query = this.supabase.from('business_events').select('*').order('created_at', { ascending: false });

    if (centreId && centreId !== 'all' && centreId !== 'Consolidated') {
      query = query.eq('centre_id', resolveCentreId(centreId));
    }
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[BusinessDayEngine] Failed to get events for date:', error);
      return [];
    }

    return (data || []) as BusinessEvent[];
  }

  /**
   * Get filtered trace transactions for Dashboard Drill-Down Modal and Payments register.
   */
  async getTraceTransactions(centreId?: string | null, category?: string, date?: string): Promise<TraceTransaction[]> {
    const events = await this.getEventsForDate(centreId, date);
    
    let filtered = events;
    if (category && category !== 'all') {
      if (category === 'revenue') {
        filtered = events.filter((e) => ['booking_sale', 'membership_sale', 'gift_card_sale'].includes(e.event_type));
      } else if (category === 'bookings') {
        filtered = events.filter((e) => e.event_type === 'booking_sale' || e.event_type === 'membership_redemption' || e.event_type === 'gift_card_redemption');
      } else if (category === 'expenses') {
        filtered = events.filter((e) => e.event_type === 'expense');
      } else if (category === 'membership_redemptions') {
        filtered = events.filter((e) => e.event_type === 'membership_redemption');
      } else if (category === 'gift_card_redemptions') {
        filtered = events.filter((e) => e.event_type === 'gift_card_redemption');
      }
    }

    return filtered.map((e) => ({
      id: e.id,
      refCode: e.ref_code || e.id,
      date: e.date,
      time: new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type: e.event_type.replace('_', ' '),
      paymentMethod: e.payment_method,
      customerName: e.customer_name || 'Walk-in Client',
      remarks: e.description || '',
      amount: e.amount,
    }));
  }

  /**
   * Get all revenue transactions for Sales/Payments Register page.
   */
  async getRevenueTransactions(centreId?: string | null): Promise<TraceTransaction[]> {
    const events = await this.getEventsForDate(centreId);
    const revenueEvents = events.filter(e => ['booking_sale', 'membership_sale', 'gift_card_sale', 'membership_redemption', 'gift_card_redemption'].includes(e.event_type));

    return revenueEvents.map((e) => ({
      id: e.id,
      refCode: e.ref_code || e.id,
      date: e.date,
      time: new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type: e.event_type,
      paymentMethod: e.payment_method,
      customerName: e.customer_name || 'Walk-in Client',
      remarks: e.description || '',
      amount: e.amount,
    }));
  }

  // ---- Daily & Monthly Register (Master Sheet & Daily Closing UI) ----

  /**
   * Get the Daily Register representation for a centre and date.
   */
  async getDailyRegister(centreId: string, date: string): Promise<DailyRegister> {
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : resolveCentreId(centreId);
    
    if (cid === 'all') {
      // Fetch all centres for this date and aggregate
      const { data: days } = await this.supabase.from('business_days').select('*').eq('date', date);
      const { data: events } = await this.supabase.from('business_events').select('*').eq('date', date);
      return this.buildDailyRegisterFromRows(date, 'all', (days || []) as BusinessDay[], (events || []) as BusinessEvent[]);
    }

    const day = await this.getBusinessDay(cid, date);
    const events = await this.getEventsForDate(cid, date);
    
    return this.buildDailyRegisterFromRows(date, cid, day ? [day] : [], events);
  }

  /**
   * Get the Monthly Register Matrix for Master Sheet Excel view.
   */
  async getMonthlyRegisterMatrix(centreId: string, yearMonthStr: string): Promise<MonthlyRegisterMatrix> {
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : resolveCentreId(centreId);
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = `${yearMonthStr}-01`;
    const endDate = this.getLastDayOfMonth(yearMonthStr);

    // One-shot fetch for efficiency
    let daysQuery = this.supabase.from('business_days').select('*').gte('date', startDate).lte('date', endDate);
    let eventsQuery = this.supabase.from('business_events').select('*').gte('date', startDate).lte('date', endDate);
    if (cid !== 'all') {
      daysQuery = daysQuery.eq('centre_id', cid);
      eventsQuery = eventsQuery.eq('centre_id', cid);
    }

    const [daysResp, eventsResp] = await Promise.all([daysQuery, eventsQuery]);
    const allDays = (daysResp.data || []) as BusinessDay[];
    const allEvents = (eventsResp.data || []) as BusinessEvent[];

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows: DailyRegister[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      const matchingDays = allDays.filter((b) => b.date === dateStr);
      const matchingEvents = allEvents.filter((e) => e.date === dateStr);
      rows.push(this.buildDailyRegisterFromRows(dateStr, cid, matchingDays, matchingEvents));
    }

    const totals: Record<string, number> = {
      openingCash: rows[0]?.openingCash || 0,
      cashSales: rows.reduce((s, r) => s + r.cashSales, 0),
      cardSales: rows.reduce((s, r) => s + r.cardSales, 0),
      upiSales: rows.reduce((s, r) => s + r.upiSales, 0),
      membershipCash: rows.reduce((s, r) => s + r.membershipCash, 0),
      membershipCard: rows.reduce((s, r) => s + r.membershipCard, 0),
      membershipUpi: rows.reduce((s, r) => s + r.membershipUpi, 0),
      giftCardSales: rows.reduce((s, r) => s + r.giftCardSales, 0),
      packageSales: rows.reduce((s, r) => s + r.packageSales, 0),
      customerAdvances: rows.reduce((s, r) => s + r.customerAdvances, 0),
      expenses: rows.reduce((s, r) => s + r.expenses, 0),
      salaryPayments: rows.reduce((s, r) => s + r.salaryPayments, 0),
      staffAdvances: rows.reduce((s, r) => s + r.staffAdvances, 0),
      cashHandover: rows.reduce((s, r) => s + r.cashHandover, 0),
      vaultHandover: rows.reduce((s, r) => s + r.cashHandover, 0),
      bankDeposits: rows.reduce((s, r) => s + r.bankDeposits, 0),
      refunds: rows.reduce((s, r) => s + r.refunds, 0),
      expectedClosingCash: rows.reduce((s, r) => s + r.expectedClosingCash, 0),
      actualCashCounted: rows.reduce((s, r) => s + (r.actualCashCounted || 0), 0),
      difference: rows.reduce((s, r) => s + (r.difference || 0), 0),
      closingCash: rows[rows.length - 1]?.actualCashCounted || rows[rows.length - 1]?.expectedClosingCash || 0,
    };

    return { yearMonthStr, centreId: cid, rows, totals };
  }

  // ---- Cash Book ----

  /**
   * Get the cash book for a specific date and centre.
   */
  async getCashBook(centreId: string, date: string): Promise<CashBookEntry[]> {
    const cid = resolveCentreId(centreId);
    const day = await this.getBusinessDay(cid, date);
    const events = await this.getEventsForDate(cid, date);
    
    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningBalance = day?.opening_cash || 0;
    const entries: CashBookEntry[] = [];

    for (const event of events) {
      if (!this.isCashEvent(event)) continue;

      const isInflow = this.isCashInflow(event);
      const amount = event.amount;

      if (isInflow) {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      entries.push({
        id: event.id,
        time: new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: isInflow ? 'IN' : 'OUT',
        eventType: event.event_type,
        category: event.category || event.event_type,
        amount,
        runningBalance,
        description: event.description,
        remarks: event.description,
        refCode: event.ref_code,
        customerName: event.customer_name,
      });
    }

    return entries;
  }

  // ---- Daily Closing & Day Locking Operations ----

  async lockDay(params: {
    centreId: string;
    date: string;
    actualCashCounted: number;
    mismatchReason?: string;
    remarks?: string;
    closedBy: string;
  }): Promise<void> {
    const resolvedId = resolveCentreId(params.centreId);
    await this.ensureBusinessDay(resolvedId, params.date);
    const day = await this.getBusinessDay(resolvedId, params.date);

    if (!day) throw new Error('Business day record could not be resolved.');

    const difference = params.actualCashCounted - day.expected_closing_cash;
    if (difference !== 0 && (!params.mismatchReason || !params.mismatchReason.trim())) {
      throw new Error('Mandatory mismatch reason required when actual cash differs from expected cash!');
    }

    // Submit closing & immediately approve/lock for streamlined operations
    const { error } = await this.supabase
      .from('business_days')
      .update({
        actual_cash_counted: params.actualCashCounted,
        cash_difference: difference,
        difference_reason: params.mismatchReason || null,
        remarks: params.remarks || null,
        status: 'CLOSED',
        closed_by: params.closedBy,
        closed_at: new Date().toISOString(),
        approved_by: params.closedBy,
      })
      .eq('id', day.id);

    if (error) {
      throw new Error(`Failed to lock business day in database: ${error.message}`);
    }

    // Ensure next day's business day is created so opening cash carries over immediately
    const nextDay = new Date(params.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDateStr = nextDay.toISOString().split('T')[0];
    try {
      await this.ensureBusinessDay(resolvedId, nextDateStr);
    } catch {
      // Non-critical if next day creation is delayed
    }
  }

  async reopenDay(
    centreId: string,
    date: string,
    reason: string,
    reopenedBy: string
  ): Promise<void> {
    const resolvedId = resolveCentreId(centreId);
    const day = await this.getBusinessDay(resolvedId, date);
    if (!day) throw new Error('Business day not found for reopening.');

    const { error } = await this.supabase
      .from('business_days')
      .update({
        status: 'REOPENED',
        reopened_by: reopenedBy,
        reopened_at: new Date().toISOString(),
        reopened_reason: reason,
      })
      .eq('id', day.id);

    if (error) {
      throw new Error(`Failed to reopen business day: ${error.message}`);
    }
  }

  // ---- General Ledger & Financial Reports ----

  async getGLTransactions(centreId?: string | null): Promise<GeneralLedgerEntry[]> {
    let query = this.supabase
      .from('general_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (centreId && centreId !== 'all' && centreId !== 'Consolidated') {
      query = query.eq('centre_id', resolveCentreId(centreId));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[BusinessDayEngine] Failed to fetch GL entries:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      ...row,
      id: row.id as string,
      transactionId: row.id as string,
      timestamp: row.created_at as string,
      time: new Date(row.created_at as string).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      business_event_id: row.business_event_id as string,
      business_day_id: row.business_day_id as string,
      centre_id: row.centre_id as string,
      date: row.date as string,
      debit_account: row.debit_account as string,
      debit_account_name: row.debit_account_name as string,
      debitAccountCode: row.debit_account as string,
      debitAccountName: row.debit_account_name as string,
      credit_account: row.credit_account as string,
      credit_account_name: row.credit_account_name as string,
      creditAccountCode: row.credit_account as string,
      creditAccountName: row.credit_account_name as string,
      amount: row.amount as number,
      module_ref: row.module_ref as string,
      moduleRef: row.module_ref as string,
      module_ref_id: row.module_ref_id as string | null,
      description: row.description as string,
      status: (row.status || 'POSTED') as 'POSTED' | 'REVERSED',
      reversal_of_id: row.reversal_of_id as string | null,
      created_at: row.created_at as string,
    }));
  }

  async reverseTransaction(transactionId: string, reason: string, user: string): Promise<void> {
    // 1. Get original GL entry
    const { data: orig, error: fetchErr } = await this.supabase
      .from('general_ledger')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchErr || !orig) throw new Error('Transaction not found in General Ledger.');
    if (orig.status === 'REVERSED') throw new Error('Transaction is already reversed.');

    // 2. Mark original as reversed
    const { error: updErr } = await this.supabase
      .from('general_ledger')
      .update({ status: 'REVERSED' })
      .eq('id', transactionId);
    if (updErr) throw new Error(`Failed to mark transaction as reversed: ${updErr.message}`);

    // 3. Insert counter entry
    await this.supabase.from('general_ledger').insert({
      business_event_id: orig.business_event_id,
      business_day_id: orig.business_day_id,
      centre_id: orig.centre_id,
      date: new Date().toISOString().split('T')[0],
      debit_account: orig.credit_account,
      debit_account_name: orig.credit_account_name,
      credit_account: orig.debit_account,
      credit_account_name: orig.debit_account_name,
      amount: orig.amount,
      module_ref: 'REVERSAL',
      module_ref_id: orig.id,
      description: `REVERSAL of [${orig.id}]: ${orig.description}. Reason: ${reason} (By: ${user})`,
      status: 'POSTED',
      reversal_of_id: orig.id,
    });
  }

  async getFinancialReports(centreId?: string | null): Promise<{ totalIncome: number; totalExpenses: number; netProfit: number; transactionCount: number }> {
    let daysQuery = this.supabase.from('business_days').select('booking_revenue, membership_revenue, gift_card_revenue, cash_expenses, upi_expenses, bank_expenses, booking_count, membership_count, gift_card_count');
    if (centreId && centreId !== 'all' && centreId !== 'Consolidated') {
      daysQuery = daysQuery.eq('centre_id', resolveCentreId(centreId));
    }

    const { data, error } = await daysQuery;
    if (error || !data) {
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 };
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    for (const row of data) {
      totalIncome += (row.booking_revenue || 0) + (row.membership_revenue || 0) + (row.gift_card_revenue || 0);
      totalExpenses += (row.cash_expenses || 0) + (row.upi_expenses || 0) + (row.bank_expenses || 0);
      transactionCount += (row.booking_count || 0) + (row.membership_count || 0) + (row.gift_card_count || 0);
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount,
    };
  }

  async getAllCentresTodayMetrics(): Promise<{ centreId: string; metrics: DayMetrics }[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('business_days')
      .select('*')
      .eq('date', today);

    if (error) {
      return [];
    }

    return (data || []).map((day: BusinessDay) => ({
      centreId: day.centre_id,
      metrics: this.businessDayToMetrics(day),
    }));
  }

  // ---- Administrative Test Suite Helpers ----

  async resetTestDatabase(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase.rpc('reset_test_database');
    if (error) {
      console.error('🚨 [BusinessDayEngine] Failed to reset test database:', error);
      throw error;
    }
    return data || {};
  }

  async verifyDatabaseIntegrity(): Promise<Record<string, any>> {
    const { data, error } = await this.supabase.rpc('verify_database_integrity');
    if (error) {
      console.error('🚨 [BusinessDayEngine] Failed to verify database integrity:', error);
      throw error;
    }
    return data || {};
  }

  // ---- Private Helpers ----

  private buildDailyRegisterFromRows(date: string, centreId: string, days: BusinessDay[], events: BusinessEvent[]): DailyRegister {
    const openingCash = days.reduce((s, d) => s + (d.opening_cash || 0), 0);
    const cashSales = days.reduce((s, d) => s + (d.cash_sales || 0), 0);
    const cardSales = days.reduce((s, d) => s + (d.card_sales || 0), 0);
    const upiSales = days.reduce((s, d) => s + (d.upi_sales || 0), 0);
    const bankSales = days.reduce((s, d) => s + (d.bank_sales || 0), 0);

    const membershipCash = events.filter(e => e.event_type === 'membership_sale' && e.payment_method === 'cash').reduce((s, e) => s + e.amount, 0);
    const membershipCard = events.filter(e => e.event_type === 'membership_sale' && e.payment_method === 'card').reduce((s, e) => s + e.amount, 0);
    const membershipUpi = events.filter(e => e.event_type === 'membership_sale' && e.payment_method === 'upi').reduce((s, e) => s + e.amount, 0);
    const giftCardSales = days.reduce((s, d) => s + (d.gift_card_revenue || 0), 0);
    const packageSales = 0;
    const customerAdvances = 0;

    const financialRevenue = cashSales + cardSales + upiSales + bankSales + membershipCash + membershipCard + membershipUpi + giftCardSales;

    const membershipRedemptionsValue = days.reduce((s, d) => s + (d.membership_redemption_value || 0), 0);
    const membershipRedemptionsCount = days.reduce((s, d) => s + (d.membership_redemption_count || 0), 0);
    const giftCardRedemptionsValue = days.reduce((s, d) => s + (d.gift_card_redemption_value || 0), 0);
    const giftCardRedemptionsCount = days.reduce((s, d) => s + (d.gift_card_redemption_count || 0), 0);
    const totalPrepaidRedemptionsValue = membershipRedemptionsValue + giftCardRedemptionsValue;

    const expenses = days.reduce((s, d) => s + (d.cash_expenses + d.upi_expenses + d.bank_expenses || 0), 0);
    const salaryPayments = events.filter(e => e.event_type === 'expense' && e.category === 'Staff Wages').reduce((s, e) => s + e.amount, 0);
    const staffAdvances = 0;
    const cashHandover = days.reduce((s, d) => s + (d.cash_movements_out || 0), 0);
    const bankDeposits = events.filter(e => e.event_type === 'cash_movement' && e.description?.toLowerCase().includes('bank')).reduce((s, e) => s + e.amount, 0);
    const refunds = days.reduce((s, d) => s + (d.refund_total || 0), 0);

    const expectedClosingCash = days.length > 0
      ? days.reduce((s, d) => s + (d.expected_closing_cash || 0), 0)
      : openingCash + cashSales + membershipCash + giftCardSales - expenses - salaryPayments - cashHandover - bankDeposits - refunds;

    const isLocked = days.some(d => d.status === 'CLOSED' || d.status === 'PENDING_APPROVAL');
    const actualCashCounted = isLocked
      ? days.reduce((s, d) => s + (d.actual_cash_counted !== null ? d.actual_cash_counted : d.expected_closing_cash || 0), 0)
      : expectedClosingCash;
    const difference = actualCashCounted - expectedClosingCash;

    const firstClosedDay = days.find(d => d.status === 'CLOSED' || d.status === 'PENDING_APPROVAL');

    return {
      date,
      centreId,
      openingCash,
      financialRevenue,
      cashSales,
      cardSales,
      upiSales,
      membershipCash,
      membershipCard,
      membershipUpi,
      giftCardSales,
      packageSales,
      customerAdvances,
      membershipRedemptionsValue,
      membershipRedemptionsCount,
      giftCardRedemptionsValue,
      giftCardRedemptionsCount,
      totalPrepaidRedemptionsValue,
      expenses,
      salaryPayments,
      staffAdvances,
      cashHandover,
      vaultHandover: cashHandover,
      bankDeposits,
      refunds,
      expectedClosingCash,
      actualCashCounted,
      difference,
      isLocked,
      closedBy: firstClosedDay?.closed_by || '',
      closedTime: firstClosedDay?.closed_at ? new Date(firstClosedDay.closed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      mismatchReason: firstClosedDay?.difference_reason || '',
      remarks: firstClosedDay?.remarks || '',
    };
  }

  private businessDayToMetrics(day: any): DayMetrics {
    const totalRevenue = Number(day.gross_revenue || day.total_sales || day.booking_revenue || 0) + Number(day.membership_revenue || 0) + Number(day.gift_card_revenue || 0);
    const totalExpenses = Number(day.total_expenses || 0) || (Number(day.cash_expenses || 0) + Number(day.upi_expenses || 0) + Number(day.bank_expenses || 0));
    const countBookings = Number(day.guest_count || day.transactions_count || day.booking_count || 0);
    const cashExpected = Number(day.expected_closing_cash || day.opening_cash || 0);

    return {
      totalRevenue,
      bookingRevenue: Number(day.booking_revenue || day.gross_revenue || day.total_sales || 0),
      membershipRevenue: Number(day.membership_revenue || 0),
      giftCardRevenue: Number(day.gift_card_revenue || 0),
      cashSales: Number(day.cash_sales || totalRevenue),
      upiSales: Number(day.upi_sales || 0),
      cardSales: Number(day.card_sales || 0),
      bankSales: Number(day.bank_sales || 0),
      totalExpenses,
      expensesTotal: totalExpenses,
      guestCount: countBookings,
      bookingCount: countBookings,
      bookingsCount: countBookings,
      membershipCount: Number(day.membership_count || 0),
      giftCardCount: Number(day.gift_card_count || 0),
      refundCount: Number(day.refund_count || 0),
      refundTotal: Number(day.refund_total || 0),
      membershipRedemptionsCount: Number(day.membership_redemption_count || 0),
      membershipRedemptionsValue: Number(day.membership_redemption_value || 0),
      giftCardRedemptionsCount: Number(day.gift_card_redemption_count || 0),
      giftCardRedemptionsValue: Number(day.gift_card_redemption_value || 0),
      openingCash: Number(day.opening_cash || 0),
      expectedClosingCash: cashExpected,
      cashInHand: cashExpected,
      actualCashCounted: day.actual_cash_counted != null ? Number(day.actual_cash_counted) : null,
      cashDifference: day.cash_difference != null ? Number(day.cash_difference) : null,
      status: (day.status || 'OPEN') as any,
    };
  }

  private aggregateMetrics(metricsList: DayMetrics[]): DayMetrics {
    return metricsList.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      bookingRevenue: acc.bookingRevenue + curr.bookingRevenue,
      membershipRevenue: acc.membershipRevenue + curr.membershipRevenue,
      giftCardRevenue: acc.giftCardRevenue + curr.giftCardRevenue,
      cashSales: acc.cashSales + curr.cashSales,
      upiSales: acc.upiSales + curr.upiSales,
      cardSales: acc.cardSales + curr.cardSales,
      bankSales: acc.bankSales + curr.bankSales,
      totalExpenses: acc.totalExpenses + curr.totalExpenses,
      expensesTotal: acc.expensesTotal + curr.expensesTotal,
      guestCount: acc.guestCount + curr.guestCount,
      bookingCount: acc.bookingCount + curr.bookingCount,
      bookingsCount: acc.bookingsCount + curr.bookingsCount,
      membershipCount: acc.membershipCount + curr.membershipCount,
      giftCardCount: acc.giftCardCount + curr.giftCardCount,
      refundCount: acc.refundCount + curr.refundCount,
      refundTotal: acc.refundTotal + curr.refundTotal,
      membershipRedemptionsCount: acc.membershipRedemptionsCount + curr.membershipRedemptionsCount,
      membershipRedemptionsValue: acc.membershipRedemptionsValue + curr.membershipRedemptionsValue,
      giftCardRedemptionsCount: acc.giftCardRedemptionsCount + curr.giftCardRedemptionsCount,
      giftCardRedemptionsValue: acc.giftCardRedemptionsValue + curr.giftCardRedemptionsValue,
      openingCash: acc.openingCash + curr.openingCash,
      expectedClosingCash: acc.expectedClosingCash + curr.expectedClosingCash,
      cashInHand: acc.cashInHand + curr.cashInHand,
      actualCashCounted: (acc.actualCashCounted || 0) + (curr.actualCashCounted || 0),
      cashDifference: (acc.cashDifference || 0) + (curr.cashDifference || 0),
      status: curr.status === 'CLOSED' && acc.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    }), this.emptyMetrics());
  }

  private emptyMetrics(): DayMetrics {
    return {
      totalRevenue: 0,
      bookingRevenue: 0,
      membershipRevenue: 0,
      giftCardRevenue: 0,
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      bankSales: 0,
      totalExpenses: 0,
      expensesTotal: 0,
      guestCount: 0,
      bookingCount: 0,
      bookingsCount: 0,
      membershipCount: 0,
      giftCardCount: 0,
      refundCount: 0,
      refundTotal: 0,
      membershipRedemptionsCount: 0,
      membershipRedemptionsValue: 0,
      giftCardRedemptionsCount: 0,
      giftCardRedemptionsValue: 0,
      openingCash: 0,
      expectedClosingCash: 0,
      cashInHand: 0,
      actualCashCounted: null,
      cashDifference: null,
      status: 'OPEN',
    };
  }

  private isCashEvent(event: BusinessEvent): boolean {
    if (event.payment_method !== 'cash') return false;
    if (event.event_type === 'cash_movement') return true;
    return ['booking_sale', 'membership_sale', 'gift_card_sale', 'expense', 'refund'].includes(event.event_type);
  }

  private isCashInflow(event: BusinessEvent): boolean {
    if (['booking_sale', 'membership_sale', 'gift_card_sale'].includes(event.event_type)) return true;
    if (event.event_type === 'cash_movement' &&
      ['float_added', 'owner_addition', 'cash_deposit'].includes(event.category || '')) return true;
    return false;
  }

  private getLastDayOfMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  }

  // ---- Real-time Synchronisation (Phase 7) ----
  subscribeToBusinessDayChanges(
    centreId: string | null | undefined,
    callback: () => void
  ): () => void {
    const resolved = centreId && centreId !== 'all' && centreId !== 'Consolidated' ? resolveCentreId(centreId) : null;
    const channelName = `bd-realtime-${resolved || 'all'}-${Math.random().toString(36).substring(2, 8)}`;
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_days',
          ...(resolved ? { filter: `centre_id=eq.${resolved}` } : {}),
        },
        () => {
          callback();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_events',
          ...(resolved ? { filter: `centre_id=eq.${resolved}` } : {}),
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

// Singleton export
export const businessDayEngine = new BusinessDayEngine();
