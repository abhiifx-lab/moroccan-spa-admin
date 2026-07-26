import { createClient } from '@/lib/supabase/client';

export type OperationType =
  | 'booking'
  | 'expense'
  | 'membership'
  | 'gift_card'
  | 'advance'
  | 'handover'
  | 'refund'
  | 'package'
  | 'salary'
  | 'bank_deposit'
  | 'customer_advance'
  | 'cash_in'
  | 'cash_out';

export type SimplePaymentMethod = 'cash' | 'card' | 'upi';

export interface OperationTransaction {
  id: string;
  type: OperationType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  centreId: string;
  centreName: string;
  amount: number;
  paymentMethod: SimplePaymentMethod;
  refCode?: string;
  customerName?: string;
  category?: string;
  remarks: string;
  user: string;
  createdAt: string;
}

export interface OperationalDailyLock {
  id: string;
  centreId: string;
  date: string;
  actualCashCounted: number;
  mismatchReason?: string;
  remarks?: string;
  closedBy: string;
  closedTime: string;
  isLocked: boolean;
}

const TX_STORAGE_KEY = 'admin_operations_transactions_v3_clean';
const LOCK_STORAGE_KEY = 'admin_operations_locks_v3_clean';

class OperationsEngine {
  private transactions: OperationTransaction[] = [];
  private locks: OperationalDailyLock[] = [];
  private isInitialized = false;

  private async syncFromSupabase() {
    try {
      const supabase = createClient();
      if (!supabase || !('from' in supabase)) return;

      const { data: sales } = await supabase.from('sales').select('*');
      const { data: expenses } = await supabase.from('expenses').select('*');

      const syncedTx: OperationTransaction[] = [];

      if (sales && sales.length > 0) {
        for (const s of sales) {
          const dateStr = s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          const timeStr = s.created_at ? s.created_at.split('T')[1].split('.')[0] : '12:00:00';
          const centreId = s.centre_id === 'loc_holidayinn' ? 'loc_holidayinn' : s.centre_id === 'loc_lulumall' ? 'loc_lulumall' : 'loc_pallasio';
          const pmLower = (s.payment_method || '').toLowerCase();
          let method: SimplePaymentMethod = 'upi';
          if (pmLower.includes('cash')) method = 'cash';
          else if (pmLower.includes('card')) method = 'card';

          syncedTx.push({
            id: s.transaction_ref || s.id,
            type: 'booking',
            date: dateStr,
            time: timeStr,
            centreId: centreId,
            centreName: centreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : centreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
            amount: Number(s.amount),
            paymentMethod: method,
            refCode: s.booking_ref,
            customerName: s.customer_name,
            remarks: s.service_name,
            user: 'System',
            createdAt: s.created_at,
          });
        }
      }

      if (expenses && expenses.length > 0) {
        for (const e of expenses) {
          const dateStr = e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          const timeStr = e.created_at ? e.created_at.split('T')[1].split('.')[0] : '12:00:00';
          const centreId = e.centre_id === 'loc_holidayinn' ? 'loc_holidayinn' : e.centre_id === 'loc_lulumall' ? 'loc_lulumall' : 'loc_pallasio';

          syncedTx.push({
            id: e.id,
            type: 'expense',
            date: dateStr,
            time: timeStr,
            centreId: centreId,
            centreName: centreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : centreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
            amount: Number(e.amount),
            paymentMethod: 'cash',
            category: e.category,
            remarks: e.description,
            user: 'Admin',
            createdAt: e.created_at,
          });
        }
      }

      if (syncedTx.length > 0) {
        const existingIds = new Set(this.transactions.map((t) => t.id));
        for (const tx of syncedTx) {
          if (!existingIds.has(tx.id)) {
            this.transactions.push(tx);
          }
        }
        this.saveTx();
      }
    } catch (err) {
      console.warn('Ops Engine Supabase sync warning:', err);
    }
  }

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.transactions = [];
      this.locks = [];
      return;
    }
    try {
      // Purge legacy dirty caches
      localStorage.removeItem('admin_operations_transactions_v1');
      localStorage.removeItem('admin_operations_transactions_v2');
      localStorage.removeItem('admin_operations_locks_v1');

      const storedTx = localStorage.getItem(TX_STORAGE_KEY);
      const parsed: OperationTransaction[] = storedTx ? JSON.parse(storedTx) : [];

      // Self-healing check for legacy locations or mock numbers
      const isDirty = parsed.some((t) =>
        !['loc_pallasio', 'loc_holidayinn', 'loc_lulumall'].includes(t.centreId) ||
        (t.centreName && (t.centreName.includes('Gomti Nagar') || t.centreName.includes('Hazratganj')))
      );

      if (isDirty) {
        this.transactions = [];
        localStorage.removeItem(TX_STORAGE_KEY);
      } else {
        this.transactions = parsed;
      }

      const storedLock = localStorage.getItem(LOCK_STORAGE_KEY);
      this.locks = storedLock ? JSON.parse(storedLock) : [];
    } catch {
      this.transactions = [];
      this.locks = [];
    }
    this.isInitialized = true;
    this.syncFromSupabase();
  }

  async fetchTransactions() {
    this.init();
    await this.syncFromSupabase();
    return this.transactions;
  }

  private saveTx() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(this.transactions));
    }
  }

  private saveLocks() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(this.locks));
    }
  }

  // Add Transaction with Supabase Sync & Error Handling
  async addTransaction(params: {
    type: OperationType;
    centreId: string;
    centreName: string;
    amount: number;
    paymentMethod: string;
    refCode?: string;
    customerName?: string;
    category?: string;
    remarks: string;
    user?: string;
    date?: string;
    time?: string;
  }): Promise<OperationTransaction> {
    this.init();
    const pmLower = (params.paymentMethod || '').toLowerCase();
    let method: SimplePaymentMethod = 'upi';
    if (pmLower.includes('cash')) method = 'cash';
    else if (pmLower.includes('card')) method = 'card';

    const dateStr = params.date || new Date().toISOString().split('T')[0];
    const timeStr = params.time || new Date().toTimeString().split(' ')[0];

    const newTx: OperationTransaction = {
      id: `op_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: params.type,
      date: dateStr,
      time: timeStr,
      centreId: params.centreId,
      centreName: params.centreName,
      amount: Math.abs(params.amount),
      paymentMethod: method,
      refCode: params.refCode,
      customerName: params.customerName,
      category: params.category,
      remarks: params.remarks,
      user: params.user || 'reception@moroccanspa.in',
      createdAt: new Date().toISOString(),
    };

    // Try Supabase insert if client configured
    try {
      const supabase = createClient();
      if (supabase && 'from' in supabase) {
        const centreUuid = params.centreId === 'loc_2' 
          ? 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' 
          : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        if (['booking', 'membership', 'gift_card', 'package'].includes(params.type)) {
          const salesPayload = {
            centre_id: centreUuid,
            transaction_ref: newTx.id,
            booking_ref: params.refCode || newTx.id,
            customer_name: params.customerName || 'Walk-in Client',
            customer_phone: '9876543210',
            service_name: params.remarks,
            amount: newTx.amount,
            tax_amount: Math.round(newTx.amount * 0.18),
            payment_method: params.paymentMethod || 'Cash',
            status: 'Completed',
          };
          console.log('Attempting Supabase Insert with Payload:', salesPayload);
          const { data, error: salesErr } = await supabase.from('sales').insert([salesPayload]).select();
          if (salesErr) {
            console.error('Supabase Insert Failed:', salesErr);
            throw new Error(`Database error saving sale: ${salesErr.message}`);
          }
          console.log('Supabase Insert Success:', data);
        } else if (params.type === 'expense') {
          const expensePayload = {
            centre_id: centreUuid,
            category: params.category || 'Utilities & Steam',
            description: params.remarks,
            amount: newTx.amount,
            payment_method: params.paymentMethod || 'Cash',
          };
          console.log('Attempting Supabase Insert with Payload:', expensePayload);
          const { data, error: expErr } = await supabase.from('expenses').insert([expensePayload]).select();
          if (expErr) {
            console.error('Supabase Insert Failed:', expErr);
            throw new Error(`Database error saving expense: ${expErr.message}`);
          }
          console.log('Supabase Insert Success:', data);
        }

        // Master Unified Transactions Table Insert (SSOT)
        const masterPayload = {
          ref_code: newTx.id,
          centre_id: centreUuid,
          branch_name: params.centreName || (params.centreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : params.centreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio'),
          type: params.type,
          amount: newTx.amount,
          payment_method: params.paymentMethod || 'Cash',
          category: params.category || null,
          customer_name: params.customerName || null,
          remarks: params.remarks || null,
          status: 'Completed',
          user_email: params.user || 'reception@moroccanspa.in',
        };

        console.log('Attempting Master Unified Supabase Insert with Payload:', masterPayload);
        const { data: masterData, error: masterErr } = await supabase.from('transactions').insert([masterPayload]).select();
        if (masterErr) {
          console.warn('Supabase Master Transactions Insert Warning:', masterErr.message);
        } else {
          console.log('Supabase Master Transactions Insert Success:', masterData);
        }
      }
    } catch (dbErr) {
      console.error('🚨 SUPABASE TRANSACTION EXCEPTION:', dbErr);
      throw dbErr;
    }

    this.transactions.unshift(newTx);
    this.saveTx();
    return newTx;
  }

  // Get Lock Record
  getLock(centreId: string, date: string): OperationalDailyLock | undefined {
    this.init();
    return this.locks.find((l) => (centreId === 'all' || l.centreId === centreId) && l.date === date);
  }

  // Opening Cash = Yesterday's Locked Closing Cash
  getOpeningCash(centreId: string, date: string): number {
    this.init();
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;

    if (cid === 'all') {
      const yesterdayLocks = this.locks.filter((l) => l.date === yesterdayStr && l.isLocked);
      return yesterdayLocks.reduce((sum, l) => sum + l.actualCashCounted, 0);
    }

    const yesterdayLock = this.locks.find((l) => l.centreId === cid && l.date === yesterdayStr);
    if (yesterdayLock && yesterdayLock.isLocked) {
      return yesterdayLock.actualCashCounted;
    }
    return 0;
  }

  // Filtered Transactions for Drill-Down Modal
  getFilteredTransactions(centreId?: string | null, category?: string, dateStr?: string): OperationTransaction[] {
    this.init();
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    return this.transactions.filter((t) => {
      const matchCentre = cid === 'all' || t.centreId === cid;
      const matchDate = t.date === targetDate;
      if (!matchCentre || !matchDate) return false;

      if (category === 'revenue') {
        // REVENUE RULE: Revenue is recognized ONLY ONCE when New Money enters the business.
        // Redemptions via Membership or Gift Card consume stored balance and are NOT new sales.
        if (['membership', 'gift_card'].includes(t.type)) return true;
        if (['booking', 'package'].includes(t.type)) {
          return !['Membership', 'Membership Pass', 'Gift Card'].includes(t.paymentMethod as string);
        }
        return false;
      } else if (category === 'bookings') {
        return t.type === 'booking';
      } else if (category === 'expenses') {
        return t.type === 'expense';
      } else if (category === 'cashSales') {
        return t.paymentMethod === 'cash' || (t.paymentMethod as string) === 'Cash at Desk';
      }
      return true;
    });
  }

  // Dashboard Metrics
  getTodayMetrics(centreId?: string | null) {
    this.init();
    const todayStr = new Date().toISOString().split('T')[0];
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;

    const todayTx = this.transactions.filter(
      (t) => (cid === 'all' || t.centreId === cid) && t.date === todayStr
    );

    // REVENUE RULE: Count ONLY New Money (Cash/Card/UPI Bookings + New Membership Sales + New Gift Card Sales)
    const totalRevenue = todayTx
      .filter((t) => {
        if (['membership', 'gift_card'].includes(t.type)) return true;
        if (['booking', 'package'].includes(t.type)) {
          return !['Membership', 'Membership Pass', 'Gift Card'].includes(t.paymentMethod as string);
        }
        return false;
      })
      .reduce((s, t) => s + t.amount, 0);

    const bookingsCount = todayTx.filter((t) => t.type === 'booking').length;

    const expensesTotal = todayTx
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    // OPERATIONAL PREPAID REDEMPTIONS (Stored balance consumption - NOT financial revenue)
    const membershipRedemptionsValue = todayTx
      .filter((t) => t.type === 'booking' && ['Membership', 'Membership Pass'].includes(t.paymentMethod as string))
      .reduce((s, t) => s + t.amount, 0);

    const giftCardRedemptionsValue = todayTx
      .filter((t) => t.type === 'booking' && (t.paymentMethod as string) === 'Gift Card')
      .reduce((s, t) => s + t.amount, 0);

    const dailyReg = this.getDailyRegister(cid, todayStr);

    return {
      todayDate: todayStr,
      totalRevenue,
      bookingsCount,
      expensesTotal,
      membershipRedemptionsValue,
      giftCardRedemptionsValue,
      totalPrepaidRedemptionsValue: membershipRedemptionsValue + giftCardRedemptionsValue,
      cashInHand: dailyReg.expectedClosingCash,
    };
  }

  // Daily Register Live Formula View
  getDailyRegister(centreId: string, date: string) {
    this.init();
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;
    const openingCash = this.getOpeningCash(cid, date);

    const dayTx = this.transactions.filter(
      (t) => (cid === 'all' || t.centreId === cid) && t.date === date
    );

    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;
    let membershipCash = 0;
    let membershipCard = 0;
    let membershipUpi = 0;
    let giftCardSales = 0;
    let packageSales = 0;
    let customerAdvances = 0;

    // OPERATIONAL PREPAID REDEMPTIONS (Redemptions consume prepaid value - NO NEW REVENUE/CASH)
    let membershipRedemptionsValue = 0;
    let membershipRedemptionsCount = 0;
    let giftCardRedemptionsValue = 0;
    let giftCardRedemptionsCount = 0;

    let expenses = 0;
    let salaryPayments = 0;
    let staffAdvances = 0;
    let cashHandover = 0;
    let bankDeposits = 0;
    let refunds = 0;
    let cashInOther = 0;
    let cashOutOther = 0;

    for (const t of dayTx) {
      if (t.type === 'cash_in') {
        cashInOther += t.amount;
      } else if (t.type === 'cash_out') {
        cashOutOther += t.amount;
      } else if (t.type === 'booking') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (['membership', 'membership pass'].includes(pm)) {
          membershipRedemptionsValue += t.amount;
          membershipRedemptionsCount += 1;
        } else if (pm === 'gift card') {
          giftCardRedemptionsValue += t.amount;
          giftCardRedemptionsCount += 1;
        } else if (pm === 'cash' || pm === 'cash at desk') {
          cashSales += t.amount;
        } else if (pm === 'card' || pm === 'card payment (pos)') {
          cardSales += t.amount;
        } else {
          upiSales += t.amount;
        }
      } else if (t.type === 'membership') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (pm.includes('cash')) membershipCash += t.amount;
        else if (pm.includes('card')) membershipCard += t.amount;
        else membershipUpi += t.amount;
      } else if (t.type === 'gift_card') {
        giftCardSales += t.amount;
      } else if (t.type === 'package') {
        packageSales += t.amount;
      } else if (t.type === 'customer_advance') {
        customerAdvances += t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
      } else if (t.type === 'salary') {
        salaryPayments += t.amount;
      } else if (t.type === 'advance') {
        staffAdvances += t.amount;
      } else if (t.type === 'handover') {
        cashHandover += t.amount;
      } else if (t.type === 'bank_deposit') {
        bankDeposits += t.amount;
      } else if (t.type === 'refund') {
        refunds += t.amount;
      }
    }

    // FINANCIAL REVENUE (NEW MONEY ENTERING BUSINESS ONLY)
    const financialRevenue = cashSales + cardSales + upiSales + membershipCash + membershipCard + membershipUpi + giftCardSales + packageSales + customerAdvances;

    // EXPECTED CLOSING CASH = Opening Cash + Cash Sales + Other Cash In - Expenses - Outflows - Other Cash Out
    const expectedClosingCash =
      openingCash +
      cashSales +
      membershipCash +
      giftCardSales +
      packageSales +
      customerAdvances +
      cashInOther -
      expenses -
      salaryPayments -
      staffAdvances -
      cashHandover -
      bankDeposits -
      refunds -
      cashOutOther;

    const lock = this.getLock(cid, date);
    const actualCashCounted = lock ? lock.actualCashCounted : expectedClosingCash;
    const difference = actualCashCounted - expectedClosingCash;

    return {
      date,
      centreId: cid,
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
      totalPrepaidRedemptionsValue: membershipRedemptionsValue + giftCardRedemptionsValue,
      expenses,
      salaryPayments,
      staffAdvances,
      cashHandover,
      vaultHandover: cashHandover, // alias for UI compatibility
      bankDeposits,
      refunds,
      expectedClosingCash,
      actualCashCounted,
      difference,
      isLocked: lock ? lock.isLocked : false,
      closedBy: lock ? lock.closedBy : '',
      closedTime: lock ? lock.closedTime : '',
      mismatchReason: lock ? lock.mismatchReason : '',
      remarks: lock ? lock.remarks : '',
    };
  }

  // Monthly Register Spreadsheet Matrix
  getMonthlyRegister(centreId: string, yearMonthStr: string) {
    this.init();
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;
      rows.push(this.getDailyRegister(centreId, dateStr));
    }

    const totals = {
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
      actualCashCounted: rows.reduce((s, r) => s + r.actualCashCounted, 0),
      difference: rows.reduce((s, r) => s + r.difference, 0),
      closingCash: rows[rows.length - 1]?.actualCashCounted || 0,
    };

    return { yearMonthStr, centreId, rows, totals };
  }

  // Cash Book Stream
  getCashBook(centreId: string, date: string) {
    this.init();
    const cid = !centreId || centreId === 'all' ? 'all' : centreId;

    const dayTx = this.transactions.filter(
      (t) => (cid === 'all' || t.centreId === cid) && t.date === date
    );

    dayTx.sort((a, b) => a.time.localeCompare(b.time));

    const openingCash = this.getOpeningCash(cid, date);
    let runningBalance = openingCash;

    const stream = [
      {
        id: `cb_open_${date}`,
        time: '00:00:00',
        type: 'OPENING',
        category: 'Opening Cash Balance',
        amount: openingCash,
        runningBalance: openingCash,
        remarks: 'Carried forward from yesterday\'s locked actual cash',
      },
    ];

    for (const t of dayTx) {
      if (t.paymentMethod === 'cash') {
        const isCashIn = ['booking', 'membership', 'gift_card'].includes(t.type);
        const isCashOut = ['expense', 'advance', 'handover', 'refund'].includes(t.type);

        if (isCashIn) {
          runningBalance += t.amount;
          stream.push({
            id: `cb_${t.id}`,
            time: t.time,
            type: 'IN',
            category: `${t.type.toUpperCase()} SALE`,
            amount: t.amount,
            runningBalance,
            remarks: t.remarks,
          });
        } else if (isCashOut) {
          runningBalance -= t.amount;
          stream.push({
            id: `cb_${t.id}`,
            time: t.time,
            type: 'OUT',
            category: t.type.toUpperCase(),
            amount: t.amount,
            runningBalance,
            remarks: t.remarks,
          });
        }
      }
    }

    return stream;
  }

  // Lock Day
  async lockDay(params: {
    centreId: string;
    date: string;
    actualCashCounted: number;
    mismatchReason?: string;
    remarks?: string;
    closedBy: string;
  }): Promise<OperationalDailyLock> {
    this.init();
    const lockRecord: OperationalDailyLock = {
      id: `lock_${params.centreId}_${params.date}`,
      centreId: params.centreId,
      date: params.date,
      actualCashCounted: params.actualCashCounted,
      mismatchReason: params.mismatchReason,
      remarks: params.remarks,
      closedBy: params.closedBy,
      closedTime: new Date().toTimeString().split(' ')[0],
      isLocked: true,
    };

    const idx = this.locks.findIndex((l) => l.centreId === params.centreId && l.date === params.date);
    if (idx !== -1) this.locks[idx] = lockRecord;
    else this.locks.push(lockRecord);

    this.saveLocks();
    return lockRecord;
  }

  // Get All Transactions
  getTransactions(centreId?: string | null): OperationTransaction[] {
    this.init();
    if (!centreId || centreId === 'all') return [...this.transactions];
    return this.transactions.filter((t) => t.centreId === centreId);
  }
}

export const operationsEngine = new OperationsEngine();
