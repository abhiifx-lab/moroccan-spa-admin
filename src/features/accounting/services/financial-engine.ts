/**
 * FINANCIAL ENGINE — Single Source of Truth (SSOT)
 * 
 * Production-grade, Supabase-backed double-entry General Ledger engine.
 * Replaces both `accounting-engine.ts` and `operations-engine.ts`.
 * 
 * CORE RULES:
 * 1. Every business action → accounting event → GL entry (immutable)
 * 2. Reports ONLY READ from GL. Reports NEVER store or calculate balances.
 * 3. Corrections via reversal entries only. No in-place modifications.
 * 4. Cash continuity: Opening Cash (Day N) ≡ Actual Cash Counted (Day N-1)
 * 5. Memberships/Gift Cards are LIABILITIES on sale, REVENUE on redemption.
 */

import { createClient } from '@/lib/supabase/client';
import { CHART_OF_ACCOUNTS, AccountHead } from '../types/chart-of-accounts.types';
import { getCentreUuid, getCentreIdFromUuid, getCentreName, CENTRE_MAP } from '@/features/centres/utils/centre-mapping';

// ============================================================================
// TYPES
// ============================================================================

export type AccountingEventType =
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_DELETED'
  | 'MEMBERSHIP_SOLD'
  | 'MEMBERSHIP_REDEEMED'
  | 'GIFT_CARD_SOLD'
  | 'GIFT_CARD_REDEEMED'
  | 'REFUND_ISSUED'
  | 'SALARY_PAID'
  | 'ADVANCE_ISSUED'
  | 'ADVANCE_RECOVERED'
  | 'CASH_DEPOSITED'
  | 'CASH_WITHDRAWN'
  | 'CASH_TRANSFERRED'
  | 'DAY_CLOSED'
  | 'DAY_REOPENED'
  | 'ADJUSTMENT';

export type ModuleRef =
  | 'booking'
  | 'expense'
  | 'membership'
  | 'gift_card'
  | 'salary'
  | 'advance'
  | 'handover'
  | 'refund'
  | 'bank_deposit'
  | 'adjustment'
  | 'cash_movement';

export interface GLEntry {
  id: string;
  event_id: string;
  entry_date: string;
  entry_time: string;
  centre_id: string;
  centre_name: string;
  debit_account_code: string;
  debit_account_name: string;
  credit_account_code: string;
  credit_account_name: string;
  amount: number;
  module_ref: ModuleRef;
  module_ref_id: string;
  booking_id?: string;
  expense_id?: string;
  membership_id?: string;
  gift_card_id?: string;
  customer_id?: string;
  customer_name?: string;
  staff_id?: string;
  therapist_id?: string;
  therapist_name?: string;
  invoice_id?: string;
  payment_method?: string;
  narration: string;
  status: 'POSTED' | 'REVERSED';
  is_reversal: boolean;
  reversal_of_id?: string;
  created_by: string;
  created_at: string;
}

export interface DailyRegisterResult {
  date: string;
  centreId: string;
  openingCash: number;
  financialRevenue: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  upi1Sales: number;
  upi2Sales: number;
  membershipCash: number;
  membershipCard: number;
  membershipUpi: number;
  giftCardSales: number;
  packageSales: number;
  customerAdvances: number;
  totalCashInToday: number;
  totalCashOutToday: number;
  todayNetCashMovement: number;
  membershipRedemptionsValue: number;
  membershipRedemptionsCount: number;
  giftCardRedemptionsValue: number;
  giftCardRedemptionsCount: number;
  totalPrepaidRedemptionsValue: number;
  expenses: number;
  salaryPayments: number;
  staffAdvances: number;
  cashHandover: number;
  vaultHandover: number;
  bankDeposits: number;
  refunds: number;
  cashInOther: number;
  cashOutOther: number;
  expectedClosingCash: number;
  actualCashCounted: number;
  difference: number;
  isLocked: boolean;
  closedBy?: string;
  closedTime?: string;
  mismatchReason: string;
  remarks: string;
}

export interface CashBookStreamEntry {
  id: string;
  time: string;
  type: 'OPENING' | 'IN' | 'OUT';
  category: string;
  amount: number;
  runningBalance: number;
  remarks: string;
  glEntryId?: string;
}

export interface DayClosure {
  id: string;
  centreId: string;
  centreName: string;
  date: string;
  systemOpeningCash: number;
  totalCashIn: number;
  totalCashOut: number;
  systemExpectedCash: number;
  actualCashCounted: number;
  difference: number;
  denominations: Record<string, number>;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  membershipSales: number;
  giftCardSales: number;
  totalRevenue: number;
  totalExpenses: number;
  status: 'OPEN' | 'CLOSED' | 'REOPENED';
  closedBy?: string;
  closedAt?: string;
  mismatchReason?: string;
  remarks?: string;
}

// ============================================================================
// HELPER: Determine debit account from payment method
// ============================================================================

function getAssetAccountFromPaymentMethod(paymentMethod: string): { code: string; name: string } {
  const pm = (paymentMethod || '').toLowerCase();
  if (pm.includes('cash') || pm === 'cash at desk') {
    return { code: '1010', name: 'Cash in Hand' };
  }
  if (pm.includes('card') && !pm.includes('gift')) {
    return { code: '1040', name: 'Card Settlement Clearing' };
  }
  if (pm.includes('upi 2') || pm.includes('upi2')) {
    return { code: '1030', name: 'UPI Wallet' }; // Same GL code, differentiated by payment_method field
  }
  if (pm.includes('upi') || pm.includes('online') || pm.includes('razorpay')) {
    return { code: '1030', name: 'UPI Wallet' };
  }
  if (pm.includes('membership')) {
    return { code: '2030', name: 'Membership Liability' };
  }
  if (pm.includes('gift')) {
    return { code: '2020', name: 'Gift Card Liability' };
  }
  // Default: UPI
  return { code: '1030', name: 'UPI Wallet' };
}

function getPaymentMethodCategory(paymentMethod: string): 'cash' | 'card' | 'upi1' | 'upi2' | 'membership' | 'gift_card' {
  const pm = (paymentMethod || '').toLowerCase();
  if (pm.includes('membership')) return 'membership';
  if (pm.includes('gift')) return 'gift_card';
  if (pm.includes('upi 2') || pm.includes('upi2')) return 'upi2';
  if (pm.includes('upi') || pm.includes('online') || pm.includes('razorpay')) return 'upi1';
  if (pm.includes('cash') || pm === 'cash at desk') return 'cash';
  if (pm.includes('card')) return 'card';
  return 'upi1';
}

function getExpenseAccountCode(category: string): { code: string; name: string } {
  const map: Record<string, { code: string; name: string }> = {
    'utilities & steam': { code: '4020', name: 'Electricity & Utilities' },
    'utilities': { code: '4020', name: 'Electricity & Utilities' },
    'supplies & oils': { code: '4110', name: 'Consumables & Spa Oils' },
    'supplies': { code: '4110', name: 'Consumables & Spa Oils' },
    'staff wages': { code: '4010', name: 'Staff Salary & Wages' },
    'staff welfare': { code: '4010', name: 'Staff Salary & Wages' },
    'maintenance': { code: '4090', name: 'Repairs & Maintenance' },
    'marketing': { code: '4060', name: 'Marketing & Ads' },
    'laundry & linen': { code: '4030', name: 'Laundry & Linen' },
    'laundry': { code: '4030', name: 'Laundry & Linen' },
    'refreshments': { code: '4040', name: 'Refreshments (Tea & Coffee)' },
    'sanitization': { code: '4050', name: 'Housekeeping & Cleaning' },
    'rent': { code: '4070', name: 'Property Rent' },
    'internet': { code: '4080', name: 'Internet & Software' },
  };
  const key = (category || '').toLowerCase();
  return map[key] || { code: '4120', name: 'Miscellaneous Expense' };
}

// ============================================================================
// FINANCIAL ENGINE CLASS
// ============================================================================

class FinancialEngine {
  // -------------------------------------------------------------------------
  // CHART OF ACCOUNTS
  // -------------------------------------------------------------------------
  getChartOfAccounts(): AccountHead[] {
    return [...CHART_OF_ACCOUNTS];
  }

  getAccountByCode(code: string): AccountHead | undefined {
    return CHART_OF_ACCOUNTS.find((a) => a.code === code);
  }

  // -------------------------------------------------------------------------
  // CORE: CREATE ACCOUNTING EVENT + GL ENTRY (Supabase)
  // -------------------------------------------------------------------------

  private async createEvent(params: {
    eventType: AccountingEventType;
    centreId: string;
    centreName: string;
    payload: Record<string, unknown>;
    sourceRef?: string;
    createdBy: string;
  }): Promise<string> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(params.centreId);

    const { data, error } = await supabase
      .from('accounting_events')
      .insert([{
        event_type: params.eventType,
        centre_id: centreUuid === 'all' ? params.centreId : centreUuid,
        centre_name: params.centreName,
        payload: params.payload,
        source_ref: params.sourceRef || null,
        created_by: params.createdBy,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('[FinancialEngine] Failed to create accounting event:', error);
      throw new Error(`Accounting event creation failed: ${error.message}`);
    }

    return data.id;
  }

  private async postGLEntry(params: {
    eventId: string;
    date: string;
    time?: string;
    centreId: string;
    centreName: string;
    debitAccountCode: string;
    creditAccountCode: string;
    amount: number;
    moduleRef: ModuleRef;
    moduleRefId: string;
    bookingId?: string;
    expenseId?: string;
    membershipId?: string;
    giftCardId?: string;
    customerId?: string;
    customerName?: string;
    therapistId?: string;
    therapistName?: string;
    paymentMethod?: string;
    narration: string;
    createdBy: string;
    isReversal?: boolean;
    reversalOfId?: string;
  }): Promise<GLEntry> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(params.centreId);

    const debitAcc = this.getAccountByCode(params.debitAccountCode);
    const creditAcc = this.getAccountByCode(params.creditAccountCode);

    if (!debitAcc || !creditAcc) {
      throw new Error(`Invalid CoA code: Debit(${params.debitAccountCode}), Credit(${params.creditAccountCode})`);
    }

    const entryDate = params.date || new Date().toISOString().split('T')[0];
    const entryTime = params.time || new Date().toTimeString().split(' ')[0];

    const payload = {
      event_id: params.eventId,
      entry_date: entryDate,
      entry_time: entryTime,
      centre_id: centreUuid === 'all' ? params.centreId : centreUuid,
      centre_name: params.centreName,
      debit_account_code: params.debitAccountCode,
      debit_account_name: debitAcc.name,
      credit_account_code: params.creditAccountCode,
      credit_account_name: creditAcc.name,
      amount: Math.abs(params.amount),
      module_ref: params.moduleRef,
      module_ref_id: params.moduleRefId,
      booking_id: params.bookingId || null,
      expense_id: params.expenseId || null,
      membership_id: params.membershipId || null,
      gift_card_id: params.giftCardId || null,
      customer_id: params.customerId || null,
      customer_name: params.customerName || null,
      therapist_id: params.therapistId || null,
      therapist_name: params.therapistName || null,
      payment_method: params.paymentMethod || null,
      narration: params.narration,
      status: 'POSTED',
      is_reversal: params.isReversal || false,
      reversal_of_id: params.reversalOfId || null,
      created_by: params.createdBy,
    };

    const { data, error } = await supabase
      .from('general_ledger')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[FinancialEngine] Failed to post GL entry:', error);
      throw new Error(`GL entry posting failed: ${error.message}`);
    }

    console.log(`✅ [GL] ${debitAcc.name} ← ₹${params.amount} → ${creditAcc.name} | ${params.narration}`);
    return data as GLEntry;
  }

  // -------------------------------------------------------------------------
  // BUSINESS EVENT PROCESSORS
  // -------------------------------------------------------------------------

  /**
   * BOOKING COMPLETED
   * Cash/Card/UPI booking: Dr Asset, Cr Service Revenue (3010)
   * Membership redemption: Dr Membership Liability (2030), Cr Service Revenue (3010)
   * Gift Card redemption: Dr Gift Card Liability (2020), Cr Service Revenue (3010)
   */
  async processBookingCompleted(params: {
    bookingRef: string;
    customerName: string;
    customerPhone?: string;
    serviceName: string;
    amount: number;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    appointmentDate: string;
    appointmentTime?: string;
    therapistName?: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const pmCategory = getPaymentMethodCategory(params.paymentMethod);

    // Create the accounting event
    const eventId = await this.createEvent({
      eventType: pmCategory === 'membership' ? 'MEMBERSHIP_REDEEMED' : pmCategory === 'gift_card' ? 'GIFT_CARD_REDEEMED' : 'BOOKING_COMPLETED',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.bookingRef,
      createdBy: params.createdBy,
    });

    // Determine debit account
    const debitAccount = getAssetAccountFromPaymentMethod(params.paymentMethod);

    // Credit is ALWAYS Service Revenue for bookings
    const creditCode = '3010';

    return this.postGLEntry({
      eventId,
      date: params.appointmentDate,
      time: params.appointmentTime ? `${params.appointmentTime}:00` : undefined,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: debitAccount.code,
      creditAccountCode: creditCode,
      amount: params.amount,
      moduleRef: 'booking',
      moduleRefId: params.bookingRef,
      bookingId: params.bookingRef,
      customerName: params.customerName,
      therapistName: params.therapistName,
      paymentMethod: params.paymentMethod,
      narration: `Booking: ${params.serviceName} for ${params.customerName} [${params.paymentMethod}]`,
      createdBy: params.createdBy,
    });
  }

  /**
   * MEMBERSHIP SOLD
   * Dr Asset (Cash/Card/UPI), Cr Membership Liability (2030)
   * NOT Revenue! Revenue is recognized only on redemption.
   */
  async processMembershipSold(params: {
    membershipId: string;
    tierName: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: 'MEMBERSHIP_SOLD',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.membershipId,
      createdBy: params.createdBy,
    });

    const debitAccount = getAssetAccountFromPaymentMethod(params.paymentMethod);

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: debitAccount.code,
      creditAccountCode: '2030', // Membership Liability (NOT Revenue!)
      amount: params.amount,
      moduleRef: 'membership',
      moduleRefId: params.membershipId,
      membershipId: params.membershipId,
      customerName: params.customerName,
      paymentMethod: params.paymentMethod,
      narration: `Membership Sold: ${params.tierName} to ${params.customerName} [Liability Created]`,
      createdBy: params.createdBy,
    });
  }

  /**
   * GIFT CARD SOLD
   * Dr Asset (Cash/Card/UPI), Cr Gift Card Liability (2020)
   * NOT Revenue! Revenue is recognized only on redemption/expiry.
   */
  async processGiftCardSold(params: {
    giftCardId: string;
    giftCardCode: string;
    faceValue: number;
    recipientName: string;
    purchaserName: string;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: 'GIFT_CARD_SOLD',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.giftCardId,
      createdBy: params.createdBy,
    });

    const debitAccount = getAssetAccountFromPaymentMethod(params.paymentMethod);

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: debitAccount.code,
      creditAccountCode: '2020', // Gift Card Liability
      amount: params.faceValue,
      moduleRef: 'gift_card',
      moduleRefId: params.giftCardId,
      giftCardId: params.giftCardId,
      customerName: params.recipientName,
      paymentMethod: params.paymentMethod,
      narration: `Gift Card Sold: ${params.giftCardCode} to ${params.recipientName} [Liability Created]`,
      createdBy: params.createdBy,
    });
  }

  /**
   * EXPENSE CREATED
   * Dr Expense Account (4xxx), Cr Cash in Hand (1010) or Bank (1020)
   */
  async processExpenseCreated(params: {
    expenseId: string;
    category: string;
    description: string;
    amount: number;
    paidTo: string;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: 'EXPENSE_CREATED',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.expenseId,
      createdBy: params.createdBy,
    });

    const expenseAccount = getExpenseAccountCode(params.category);
    const pm = (params.paymentMethod || '').toLowerCase();
    const creditCode = pm.includes('bank') ? '1020' : '1010';
    const creditName = pm.includes('bank') ? 'Bank Account' : 'Cash in Hand';

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: expenseAccount.code,
      creditAccountCode: creditCode,
      amount: params.amount,
      moduleRef: 'expense',
      moduleRefId: params.expenseId,
      expenseId: params.expenseId,
      paymentMethod: params.paymentMethod,
      narration: `Expense: ${params.category} - ${params.description} (Paid to ${params.paidTo})`,
      createdBy: params.createdBy,
    });
  }

  /**
   * REFUND ISSUED
   * Dr Refunds Paid (4100), Cr Asset (Cash/Card/UPI)
   */
  async processRefundIssued(params: {
    refundId: string;
    originalBookingRef: string;
    amount: number;
    reason: string;
    paymentMethod: string;
    customerName: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: 'REFUND_ISSUED',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.refundId,
      createdBy: params.createdBy,
    });

    const creditAccount = getAssetAccountFromPaymentMethod(params.paymentMethod);

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: '4100', // Refunds Paid
      creditAccountCode: creditAccount.code,
      amount: params.amount,
      moduleRef: 'refund',
      moduleRefId: params.refundId,
      bookingId: params.originalBookingRef,
      customerName: params.customerName,
      paymentMethod: params.paymentMethod,
      narration: `Refund: ${params.reason} for booking ${params.originalBookingRef}`,
      createdBy: params.createdBy,
    });
  }

  /**
   * SALARY PAID
   * Dr Staff Salary & Wages (4010), Cr Cash (1010) or Bank (1020)
   */
  async processSalaryPaid(params: {
    salaryId: string;
    staffName: string;
    amount: number;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: 'SALARY_PAID',
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.salaryId,
      createdBy: params.createdBy,
    });

    const pm = (params.paymentMethod || '').toLowerCase();
    const creditCode = pm.includes('bank') ? '1020' : '1010';

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: '4010',
      creditAccountCode: creditCode,
      amount: params.amount,
      moduleRef: 'salary',
      moduleRefId: params.salaryId,
      customerName: params.staffName,
      paymentMethod: params.paymentMethod,
      narration: `Salary Paid: ${params.staffName}`,
      createdBy: params.createdBy,
    });
  }

  /**
   * CASH MOVEMENT (Deposit to Bank, Withdraw, Vault Handover)
   */
  async processCashMovement(params: {
    movementId: string;
    type: 'CASH_DEPOSITED' | 'CASH_WITHDRAWN' | 'CASH_TRANSFERRED';
    amount: number;
    reason: string;
    centreId: string;
    centreName: string;
    date: string;
    createdBy: string;
  }): Promise<GLEntry> {
    const eventId = await this.createEvent({
      eventType: params.type,
      centreId: params.centreId,
      centreName: params.centreName,
      payload: params as unknown as Record<string, unknown>,
      sourceRef: params.movementId,
      createdBy: params.createdBy,
    });

    let debitCode = '1020'; // Bank Account
    let creditCode = '1010'; // Cash in Hand

    if (params.type === 'CASH_WITHDRAWN') {
      debitCode = '1010'; // Cash in Hand
      creditCode = '1020'; // Bank Account
    } else if (params.type === 'CASH_TRANSFERRED') {
      debitCode = '1050'; // Petty Cash Vault
      creditCode = '1010'; // Cash in Hand
    }

    const moduleRef: ModuleRef = params.type === 'CASH_TRANSFERRED' ? 'handover' : 'bank_deposit';

    return this.postGLEntry({
      eventId,
      date: params.date,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: debitCode,
      creditAccountCode: creditCode,
      amount: params.amount,
      moduleRef,
      moduleRefId: params.movementId,
      paymentMethod: 'Cash',
      narration: `Cash Movement: ${params.type} - ${params.reason}`,
      createdBy: params.createdBy,
    });
  }

  // -------------------------------------------------------------------------
  // REVERSAL (Immutable Correction)
  // -------------------------------------------------------------------------

  /**
   * Reverse a GL entry by creating a mirror entry (swap debit/credit).
   * The original entry remains with status 'POSTED'.
   * The reversal entry has is_reversal = true.
   */
  async reverseEntry(glEntryId: string, reason: string, createdBy: string): Promise<GLEntry> {
    const supabase = createClient();

    const { data: original, error } = await supabase
      .from('general_ledger')
      .select('*')
      .eq('id', glEntryId)
      .single();

    if (error || !original) {
      throw new Error(`GL entry ${glEntryId} not found for reversal.`);
    }

    if (original.status === 'REVERSED') {
      throw new Error(`GL entry ${glEntryId} is already reversed.`);
    }

    const eventId = await this.createEvent({
      eventType: 'ADJUSTMENT',
      centreId: original.centre_id,
      centreName: original.centre_name,
      payload: { reason, originalEntryId: glEntryId },
      sourceRef: `REV-${glEntryId}`,
      createdBy,
    });

    // Create mirror entry (swap debit and credit)
    const reversalEntry = await this.postGLEntry({
      eventId,
      date: new Date().toISOString().split('T')[0],
      centreId: original.centre_id,
      centreName: original.centre_name,
      debitAccountCode: original.credit_account_code,   // Swapped!
      creditAccountCode: original.debit_account_code,   // Swapped!
      amount: original.amount,
      moduleRef: original.module_ref,
      moduleRefId: original.module_ref_id,
      bookingId: original.booking_id,
      expenseId: original.expense_id,
      membershipId: original.membership_id,
      giftCardId: original.gift_card_id,
      customerName: original.customer_name,
      paymentMethod: original.payment_method,
      narration: `REVERSAL of ${glEntryId}: ${reason}`,
      createdBy,
      isReversal: true,
      reversalOfId: glEntryId,
    });

    // Mark original as REVERSED (this is the ONE exception to immutability —
    // we only update the status field, never the financial data)
    await supabase
      .from('general_ledger')
      .update({ status: 'REVERSED' })
      .eq('id', glEntryId);

    return reversalEntry;
  }

  // -------------------------------------------------------------------------
  // DERIVED READ-ONLY QUERIES (Single Source of Truth)
  // -------------------------------------------------------------------------

  /**
   * Fetch all GL entries for a centre and date, status = POSTED
   */
  async getGLEntries(centreId: string, date?: string, startDate?: string, endDate?: string): Promise<GLEntry[]> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    let query = supabase
      .from('general_ledger')
      .select('*')
      .eq('status', 'POSTED');

    if (centreUuid !== 'all') {
      query = query.eq('centre_id', centreUuid);
    }

    if (date) {
      query = query.eq('entry_date', date);
    } else {
      if (startDate) query = query.gte('entry_date', startDate);
      if (endDate) query = query.lte('entry_date', endDate);
    }

    query = query.order('entry_date', { ascending: true }).order('entry_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[FinancialEngine] Failed to fetch GL entries:', error);
      return [];
    }

    return (data || []) as GLEntry[];
  }

  /**
   * OPENING CASH for a centre on a given date.
   * Rule: Opening Cash (Day N) = Actual Cash Counted (Day N-1)
   * Fallback: Derive from all prior GL entries touching Cash in Hand (1010)
   */
  async getOpeningCash(centreId: string, date: string): Promise<number> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    // Calculate yesterday
    const d = new Date(date.includes('T') ? date : `${date}T12:00:00Z`);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    // 1. Check if yesterday has a closed cash closure
    if (centreUuid !== 'all') {
      const { data: closure } = await supabase
        .from('daily_cash_closures')
        .select('actual_cash_counted')
        .eq('centre_id', centreUuid)
        .eq('closure_date', yesterdayStr)
        .eq('status', 'CLOSED')
        .single();

      if (closure) {
        return Number(closure.actual_cash_counted);
      }
    } else {
      // Consolidated: sum all centres' closures
      const { data: closures } = await supabase
        .from('daily_cash_closures')
        .select('actual_cash_counted')
        .eq('closure_date', yesterdayStr)
        .eq('status', 'CLOSED');

      if (closures && closures.length > 0) {
        return closures.reduce((sum, c) => sum + Number(c.actual_cash_counted), 0);
      }
    }

    // 2. Fallback: Derive cumulative cash balance from ALL GL entries prior to date
    // Cash balance = SUM(debits to 1010) - SUM(credits from 1010) for all dates < target
    let debitQuery = supabase
      .from('general_ledger')
      .select('amount')
      .eq('debit_account_code', '1010')
      .eq('status', 'POSTED')
      .lt('entry_date', date);

    let creditQuery = supabase
      .from('general_ledger')
      .select('amount')
      .eq('credit_account_code', '1010')
      .eq('status', 'POSTED')
      .lt('entry_date', date);

    if (centreUuid !== 'all') {
      debitQuery = debitQuery.eq('centre_id', centreUuid);
      creditQuery = creditQuery.eq('centre_id', centreUuid);
    }

    const [{ data: debits }, { data: credits }] = await Promise.all([debitQuery, creditQuery]);

    const totalDebits = (debits || []).reduce((sum, d) => sum + Number(d.amount), 0);
    const totalCredits = (credits || []).reduce((sum, c) => sum + Number(c.amount), 0);

    return totalDebits - totalCredits;
  }

  /**
   * DAILY REGISTER — Full day's financial summary derived entirely from GL
   */
  async getDailyRegister(centreId: string, date: string): Promise<DailyRegisterResult> {
    const cid = (!centreId || centreId === 'all' || centreId === 'Consolidated') ? 'all' : centreId;
    const openingCash = await this.getOpeningCash(cid, date);
    const entries = await this.getGLEntries(cid, date);

    let cashSales = 0, cardSales = 0, upiSales = 0, upi1Sales = 0, upi2Sales = 0;
    let membershipCash = 0, membershipCard = 0, membershipUpi = 0;
    let giftCardSales = 0, packageSales = 0, customerAdvances = 0;
    let membershipRedemptionsValue = 0, membershipRedemptionsCount = 0;
    let giftCardRedemptionsValue = 0, giftCardRedemptionsCount = 0;
    let expenses = 0, salaryPayments = 0, staffAdvances = 0;
    let cashHandover = 0, bankDeposits = 0, refunds = 0;
    let cashInOther = 0, cashOutOther = 0;

    for (const e of entries) {
      const pmCat = getPaymentMethodCategory(e.payment_method || '');

      if (e.module_ref === 'booking') {
        // Check if this was a prepaid redemption
        if (e.debit_account_code === '2030') {
          // Membership redemption
          membershipRedemptionsValue += e.amount;
          membershipRedemptionsCount += 1;
        } else if (e.debit_account_code === '2020') {
          // Gift card redemption
          giftCardRedemptionsValue += e.amount;
          giftCardRedemptionsCount += 1;
        } else {
          // Normal cash/card/UPI sale
          if (pmCat === 'cash') cashSales += e.amount;
          else if (pmCat === 'card') cardSales += e.amount;
          else if (pmCat === 'upi2') { upi2Sales += e.amount; upiSales += e.amount; }
          else { upi1Sales += e.amount; upiSales += e.amount; }
        }
      } else if (e.module_ref === 'membership') {
        // Membership SALE (liability) — categorize by payment method
        if (pmCat === 'cash') membershipCash += e.amount;
        else if (pmCat === 'card') membershipCard += e.amount;
        else {
          membershipUpi += e.amount;
          if (pmCat === 'upi2') upi2Sales += e.amount;
          else upi1Sales += e.amount;
        }
      } else if (e.module_ref === 'gift_card') {
        giftCardSales += e.amount;
      } else if (e.module_ref === 'expense') {
        expenses += e.amount;
      } else if (e.module_ref === 'salary') {
        salaryPayments += e.amount;
      } else if (e.module_ref === 'advance') {
        staffAdvances += e.amount;
      } else if (e.module_ref === 'handover') {
        cashHandover += e.amount;
      } else if (e.module_ref === 'bank_deposit') {
        bankDeposits += e.amount;
      } else if (e.module_ref === 'refund') {
        refunds += e.amount;
      } else if (e.module_ref === 'cash_movement') {
        if (e.debit_account_code === '1010') cashInOther += e.amount;
        else if (e.credit_account_code === '1010') cashOutOther += e.amount;
      }
    }

    // FINANCIAL REVENUE = All NEW money entering the business
    // Membership/GiftCard sales ARE financial revenue (cash entered)
    // Membership/GiftCard REDEMPTIONS are NOT (prepaid balance consumption)
    const financialRevenue = cashSales + cardSales + upiSales +
      membershipCash + membershipCard + membershipUpi +
      giftCardSales + packageSales + customerAdvances;

    // CASH FLOW
    const totalCashInToday = cashSales + membershipCash + giftCardSales + packageSales + customerAdvances + cashInOther;
    const totalCashOutToday = expenses + salaryPayments + staffAdvances + cashHandover + bankDeposits + refunds + cashOutOther;
    const todayNetCashMovement = totalCashInToday - totalCashOutToday;
    const expectedClosingCash = openingCash + todayNetCashMovement;

    // Check for day closure lock
    const closure = await this.getDayClosure(cid, date);
    const isLocked = closure?.status === 'CLOSED';
    const actualCashCounted = closure ? Number(closure.actualCashCounted) : expectedClosingCash;
    const difference = actualCashCounted - expectedClosingCash;

    return {
      date,
      centreId: cid,
      openingCash,
      financialRevenue,
      cashSales, cardSales, upiSales, upi1Sales, upi2Sales,
      membershipCash, membershipCard, membershipUpi,
      giftCardSales, packageSales, customerAdvances,
      totalCashInToday, totalCashOutToday, todayNetCashMovement,
      membershipRedemptionsValue, membershipRedemptionsCount,
      giftCardRedemptionsValue, giftCardRedemptionsCount,
      totalPrepaidRedemptionsValue: membershipRedemptionsValue + giftCardRedemptionsValue,
      expenses, salaryPayments, staffAdvances,
      cashHandover, vaultHandover: cashHandover,
      bankDeposits, refunds, cashInOther, cashOutOther,
      expectedClosingCash, actualCashCounted, difference,
      isLocked,
      closedBy: closure?.closedBy,
      closedTime: closure?.closedAt,
      mismatchReason: closure?.mismatchReason || '',
      remarks: closure?.remarks || '',
    };
  }

  /**
   * CASH BOOK — Chronological stream of all cash-touching transactions
   */
  async getCashBook(centreId: string, date: string): Promise<CashBookStreamEntry[]> {
    const cid = (!centreId || centreId === 'all') ? 'all' : centreId;
    const openingCash = await this.getOpeningCash(cid, date);
    const entries = await this.getGLEntries(cid, date);

    let runningBalance = openingCash;
    const stream: CashBookStreamEntry[] = [
      {
        id: `cb_open_${date}`,
        time: '00:00:00',
        type: 'OPENING',
        category: 'Opening Cash Balance',
        amount: openingCash,
        runningBalance: openingCash,
        remarks: "Carried forward from yesterday's actual cash count",
      },
    ];

    for (const e of entries) {
      const isCashDebit = e.debit_account_code === '1010';
      const isCashCredit = e.credit_account_code === '1010';

      if (isCashDebit) {
        runningBalance += e.amount;
        stream.push({
          id: `cb_${e.id}`,
          time: e.entry_time,
          type: 'IN',
          category: e.credit_account_name,
          amount: e.amount,
          runningBalance,
          remarks: e.narration,
          glEntryId: e.id,
        });
      } else if (isCashCredit) {
        runningBalance -= e.amount;
        stream.push({
          id: `cb_${e.id}`,
          time: e.entry_time,
          type: 'OUT',
          category: e.debit_account_name,
          amount: e.amount,
          runningBalance,
          remarks: e.narration,
          glEntryId: e.id,
        });
      }
    }

    return stream;
  }

  /**
   * MONTHLY REGISTER — One row per day for the month
   */
  async getMonthlyRegister(centreId: string, yearMonthStr: string) {
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const rows: DailyRegisterResult[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;
      rows.push(await this.getDailyRegister(centreId, dateStr));
    }

    const totals = {
      totalSales: rows.reduce((s, r) => s + r.financialRevenue + r.cashInOther, 0),
      openingCash: rows[0]?.openingCash || 0,
      cashSales: rows.reduce((s, r) => s + r.cashSales, 0),
      cardSales: rows.reduce((s, r) => s + r.cardSales, 0),
      upiSales: rows.reduce((s, r) => s + r.upiSales, 0),
      upi1Sales: rows.reduce((s, r) => s + (r.upi1Sales || 0), 0),
      upi2Sales: rows.reduce((s, r) => s + (r.upi2Sales || 0), 0),
      membershipCash: rows.reduce((s, r) => s + r.membershipCash, 0),
      membershipCard: rows.reduce((s, r) => s + r.membershipCard, 0),
      membershipUpi: rows.reduce((s, r) => s + r.membershipUpi, 0),
      membershipSales: rows.reduce((s, r) => s + (r.membershipCash + r.membershipCard + r.membershipUpi), 0),
      giftCardSales: rows.reduce((s, r) => s + r.giftCardSales, 0),
      packageSales: rows.reduce((s, r) => s + r.packageSales, 0),
      customerAdvances: rows.reduce((s, r) => s + r.customerAdvances, 0),
      otherIncome: rows.reduce((s, r) => s + r.cashInOther, 0),
      expenses: rows.reduce((s, r) => s + r.expenses, 0),
      salaryPayments: rows.reduce((s, r) => s + r.salaryPayments, 0),
      staffAdvances: rows.reduce((s, r) => s + r.staffAdvances, 0),
      cashHandover: rows.reduce((s, r) => s + r.cashHandover, 0),
      vaultHandover: rows.reduce((s, r) => s + r.cashHandover, 0),
      bankDeposits: rows.reduce((s, r) => s + r.bankDeposits, 0),
      refunds: rows.reduce((s, r) => s + r.refunds, 0),
      expectedClosingCash: rows[rows.length - 1]?.expectedClosingCash || 0,
      actualCashCounted: rows[rows.length - 1]?.actualCashCounted || 0,
      difference: rows.reduce((s, r) => s + r.difference, 0),
      closingCash: rows[rows.length - 1]?.expectedClosingCash || 0,
      closedDaysCount: rows.filter((r) => r.isLocked).length,
      totalDaysCount: rows.length,
    };

    return { yearMonthStr, centreId, rows, totals };
  }

  /**
   * MULTI-CENTRE MONTHLY MATRIX — Side-by-side comparison
   */
  async getMultiCentreMonthlySummary(yearMonthStr: string) {
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const luluId = 'loc_lulumall';
    const palassioId = 'loc_pallasio';
    const holidayId = 'loc_holidayinn';

    const rows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;

      const [luluReg, palassioReg, holidayReg] = await Promise.all([
        this.getDailyRegister(luluId, dateStr),
        this.getDailyRegister(palassioId, dateStr),
        this.getDailyRegister(holidayId, dateStr),
      ]);

      rows.push({
        date: dateStr,
        day,
        luluSales: luluReg.financialRevenue,
        palassioSales: palassioReg.financialRevenue,
        holidaySales: holidayReg.financialRevenue,
        orgTotal: luluReg.financialRevenue + palassioReg.financialRevenue + holidayReg.financialRevenue,
      });
    }

    const totals = {
      luluSales: rows.reduce((s, r) => s + r.luluSales, 0),
      palassioSales: rows.reduce((s, r) => s + r.palassioSales, 0),
      holidaySales: rows.reduce((s, r) => s + r.holidaySales, 0),
      orgTotal: rows.reduce((s, r) => s + r.orgTotal, 0),
    };

    return { yearMonthStr, rows, totals };
  }

  /**
   * TODAY'S DASHBOARD METRICS
   */
  async getTodayMetrics(centreId?: string | null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const cid = (!centreId || centreId === 'all' || centreId === 'Consolidated') ? 'all' : getCentreIdFromUuid(centreId);
    const reg = await this.getDailyRegister(cid, todayStr);

    return {
      todayDate: todayStr,
      totalRevenue: reg.financialRevenue,
      bookingsCount: (await this.getGLEntries(cid, todayStr)).filter(e => e.module_ref === 'booking').length,
      expensesTotal: reg.expenses,
      membershipRedemptionsValue: reg.membershipRedemptionsValue,
      giftCardRedemptionsValue: reg.giftCardRedemptionsValue,
      totalPrepaidRedemptionsValue: reg.totalPrepaidRedemptionsValue,
      cashInHand: reg.expectedClosingCash,
      cashSales: reg.cashSales,
      cardSales: reg.cardSales,
      upiSales: reg.upiSales,
    };
  }

  /**
   * CENTRES OVERVIEW (Top Bar Matrix)
   */
  async getCentresOverview(date: string) {
    const list = [
      { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall', shortName: 'Lulu Mall' },
      { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio', shortName: 'Phoenix Palassio' },
      { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn', shortName: 'Holiday Inn' },
    ];

    const results = await Promise.all(
      list.map(async (c) => {
        const reg = await this.getDailyRegister(c.id, date);
        let status: 'Closed' | 'Open' | 'Review' = 'Open';
        if (reg.isLocked) {
          status = reg.difference === 0 ? 'Closed' : 'Review';
        } else if (reg.difference !== 0) {
          status = 'Review';
        }

        return {
          id: c.id,
          name: c.name,
          shortName: c.shortName,
          status,
          sales: reg.financialRevenue,
          cash: reg.cashSales + reg.membershipCash + reg.cashInOther,
          digital: reg.cardSales + reg.upiSales + reg.membershipCard + reg.membershipUpi,
          variance: reg.difference,
          isLocked: reg.isLocked,
        };
      })
    );

    return results;
  }

  /**
   * DRILL-DOWN: Get GL entries filtered by category
   */
  async getDrillDownTransactions(centreId: string | null, category: string, date: string): Promise<GLEntry[]> {
    const entries = await this.getGLEntries(centreId || 'all', date);

    return entries.filter((e) => {
      if (category === 'revenue') {
        // Revenue = new money entries (not redemptions)
        if (['membership', 'gift_card'].includes(e.module_ref)) return true;
        if (e.module_ref === 'booking' && e.debit_account_code !== '2030' && e.debit_account_code !== '2020') return true;
        return false;
      }
      if (category === 'bookings') return e.module_ref === 'booking';
      if (category === 'expenses') return e.module_ref === 'expense';
      if (category === 'cashSales') return e.debit_account_code === '1010' && e.module_ref === 'booking';
      return true;
    });
  }

  /**
   * FINANCIAL REPORTS (P&L, date range)
   */
  async getFinancialReports(centreId?: string | null, startDate?: string, endDate?: string) {
    const cid = (!centreId || centreId === 'all') ? 'all' : centreId;
    const entries = await this.getGLEntries(cid, undefined, startDate, endDate);

    const totalIncome = entries
      .filter((e) => e.credit_account_code.startsWith('3'))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = entries
      .filter((e) => e.debit_account_code.startsWith('4'))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      transactionCount: entries.length,
    };
  }

  // -------------------------------------------------------------------------
  // DAY CLOSURE (Cash Drawer Reconciliation)
  // -------------------------------------------------------------------------

  async getDayClosure(centreId: string, date: string): Promise<DayClosure | null> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    if (centreUuid === 'all') {
      // Check if ALL centres are closed
      const { data: closures } = await supabase
        .from('daily_cash_closures')
        .select('*')
        .eq('closure_date', date)
        .eq('status', 'CLOSED');

      if (!closures || closures.length === 0) return null;

      // Return an aggregated closure
      return {
        id: `consolidated_${date}`,
        centreId: 'all',
        centreName: 'All Centres',
        date,
        systemOpeningCash: closures.reduce((s, c) => s + Number(c.system_opening_cash), 0),
        totalCashIn: closures.reduce((s, c) => s + Number(c.total_cash_in), 0),
        totalCashOut: closures.reduce((s, c) => s + Number(c.total_cash_out), 0),
        systemExpectedCash: closures.reduce((s, c) => s + Number(c.system_expected_cash), 0),
        actualCashCounted: closures.reduce((s, c) => s + Number(c.actual_cash_counted), 0),
        difference: closures.reduce((s, c) => s + Number(c.difference), 0),
        denominations: {},
        cashSales: closures.reduce((s, c) => s + Number(c.cash_sales || 0), 0),
        cardSales: closures.reduce((s, c) => s + Number(c.card_sales || 0), 0),
        upiSales: closures.reduce((s, c) => s + Number(c.upi_sales || 0), 0),
        membershipSales: closures.reduce((s, c) => s + Number(c.membership_sales || 0), 0),
        giftCardSales: closures.reduce((s, c) => s + Number(c.gift_card_sales || 0), 0),
        totalRevenue: closures.reduce((s, c) => s + Number(c.total_revenue || 0), 0),
        totalExpenses: closures.reduce((s, c) => s + Number(c.total_expenses || 0), 0),
        status: closures.length >= 3 ? 'CLOSED' : 'OPEN',
        closedBy: closures.map(c => c.closed_by).filter(Boolean).join('; '),
        closedAt: closures.map(c => c.closed_at).filter(Boolean).join('; '),
        mismatchReason: closures.map(c => c.mismatch_reason).filter(Boolean).join('; '),
        remarks: closures.map(c => c.remarks).filter(Boolean).join('; '),
      };
    }

    const { data, error } = await supabase
      .from('daily_cash_closures')
      .select('*')
      .eq('centre_id', centreUuid)
      .eq('closure_date', date)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      centreId: getCentreIdFromUuid(data.centre_id),
      centreName: data.centre_name,
      date: data.closure_date,
      systemOpeningCash: Number(data.system_opening_cash),
      totalCashIn: Number(data.total_cash_in),
      totalCashOut: Number(data.total_cash_out),
      systemExpectedCash: Number(data.system_expected_cash),
      actualCashCounted: Number(data.actual_cash_counted),
      difference: Number(data.difference),
      denominations: data.denominations || {},
      cashSales: Number(data.cash_sales || 0),
      cardSales: Number(data.card_sales || 0),
      upiSales: Number(data.upi_sales || 0),
      membershipSales: Number(data.membership_sales || 0),
      giftCardSales: Number(data.gift_card_sales || 0),
      totalRevenue: Number(data.total_revenue || 0),
      totalExpenses: Number(data.total_expenses || 0),
      status: data.status,
      closedBy: data.closed_by,
      closedAt: data.closed_at,
      mismatchReason: data.mismatch_reason,
      remarks: data.remarks,
    };
  }

  async lockDay(params: {
    centreId: string;
    date: string;
    actualCashCounted: number;
    denominations?: Record<string, number>;
    mismatchReason?: string;
    remarks?: string;
    closedBy: string;
  }): Promise<DayClosure> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(params.centreId);
    const centreName = getCentreName(params.centreId);

    // Get the daily register to snapshot GL-derived figures
    const reg = await this.getDailyRegister(params.centreId, params.date);

    const closurePayload = {
      centre_id: centreUuid,
      centre_name: centreName,
      closure_date: params.date,
      system_opening_cash: reg.openingCash,
      total_cash_in: reg.totalCashInToday,
      total_cash_out: reg.totalCashOutToday,
      system_expected_cash: reg.expectedClosingCash,
      actual_cash_counted: params.actualCashCounted,
      difference: params.actualCashCounted - reg.expectedClosingCash,
      denominations: params.denominations || {},
      cash_sales: reg.cashSales,
      card_sales: reg.cardSales,
      upi_sales: reg.upiSales,
      membership_sales: reg.membershipCash + reg.membershipCard + reg.membershipUpi,
      gift_card_sales: reg.giftCardSales,
      total_revenue: reg.financialRevenue,
      total_expenses: reg.expenses,
      mismatch_reason: params.mismatchReason || null,
      remarks: params.remarks || null,
      status: 'CLOSED',
      closed_by: params.closedBy,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('daily_cash_closures')
      .upsert([closurePayload], { onConflict: 'centre_id,closure_date' })
      .select()
      .single();

    if (error) {
      console.error('[FinancialEngine] Failed to lock day:', error);
      throw new Error(`Day closure failed: ${error.message}`);
    }

    // Create accounting event for audit
    await this.createEvent({
      eventType: 'DAY_CLOSED',
      centreId: params.centreId,
      centreName,
      payload: {
        date: params.date,
        expectedCash: reg.expectedClosingCash,
        actualCash: params.actualCashCounted,
        difference: params.actualCashCounted - reg.expectedClosingCash,
      },
      sourceRef: data.id,
      createdBy: params.closedBy,
    });

    console.log(`🔒 [DAY CLOSED] ${centreName} | ${params.date} | Expected: ₹${reg.expectedClosingCash} | Actual: ₹${params.actualCashCounted}`);

    return {
      id: data.id,
      centreId: params.centreId,
      centreName,
      date: params.date,
      systemOpeningCash: reg.openingCash,
      totalCashIn: reg.totalCashInToday,
      totalCashOut: reg.totalCashOutToday,
      systemExpectedCash: reg.expectedClosingCash,
      actualCashCounted: params.actualCashCounted,
      difference: params.actualCashCounted - reg.expectedClosingCash,
      denominations: params.denominations || {},
      cashSales: reg.cashSales,
      cardSales: reg.cardSales,
      upiSales: reg.upiSales,
      membershipSales: reg.membershipCash + reg.membershipCard + reg.membershipUpi,
      giftCardSales: reg.giftCardSales,
      totalRevenue: reg.financialRevenue,
      totalExpenses: reg.expenses,
      status: 'CLOSED',
      closedBy: params.closedBy,
      closedAt: new Date().toISOString(),
      mismatchReason: params.mismatchReason,
      remarks: params.remarks,
    };
  }

  async reopenDay(params: {
    centreId: string;
    date: string;
    reason: string;
    reopenedBy: string;
  }): Promise<void> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(params.centreId);

    const { error } = await supabase
      .from('daily_cash_closures')
      .update({
        status: 'REOPENED',
        reopened_by: params.reopenedBy,
        reopened_at: new Date().toISOString(),
        reopen_reason: params.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('centre_id', centreUuid)
      .eq('closure_date', params.date);

    if (error) {
      throw new Error(`Day reopen failed: ${error.message}`);
    }

    await this.createEvent({
      eventType: 'DAY_REOPENED',
      centreId: params.centreId,
      centreName: getCentreName(params.centreId),
      payload: { date: params.date, reason: params.reason },
      sourceRef: `reopen_${params.centreId}_${params.date}`,
      createdBy: params.reopenedBy,
    });
  }

  /**
   * Check if a date is locked for a centre
   */
  async isDateLocked(centreId: string, date: string): Promise<boolean> {
    const closure = await this.getDayClosure(centreId, date);
    return closure?.status === 'CLOSED';
  }

  // -------------------------------------------------------------------------
  // GL TRANSACTIONS LIST (for audit/drill-down)
  // -------------------------------------------------------------------------

  async getGLTransactions(centreId?: string | null): Promise<GLEntry[]> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId || 'all');

    let query = supabase
      .from('general_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (centreUuid !== 'all') {
      query = query.eq('centre_id', centreUuid);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[FinancialEngine] Failed to fetch GL transactions:', error);
      return [];
    }

    return (data || []) as GLEntry[];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const financialEngine = new FinancialEngine();
