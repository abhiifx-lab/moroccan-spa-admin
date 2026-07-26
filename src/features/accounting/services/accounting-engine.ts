import { CHART_OF_ACCOUNTS, AccountHead } from '../types/chart-of-accounts.types';
import { GeneralLedgerEntry, CashBookEntry, DailyClosureLock, ModuleRef } from '../types/general-ledger.types';
import { domainEventBus, DomainEvent } from '@/features/events/domain-event-bus';

const GL_STORAGE_KEY = 'admin_gl_journal_v5_clean';
const LOCKS_STORAGE_KEY = 'admin_daily_locks_v5_clean';

class AccountingEngine {
  private glEntries: GeneralLedgerEntry[] = [];
  private dailyLocks: DailyClosureLock[] = [];
  private isInitialized = false;

  constructor() {
    this.setupDomainEventSubscriptions();
  }

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.glEntries = [];
      this.dailyLocks = [];
      return;
    }
    try {
      const storedGL = localStorage.getItem(GL_STORAGE_KEY);
      this.glEntries = storedGL ? JSON.parse(storedGL) : [];

      const storedLocks = localStorage.getItem(LOCKS_STORAGE_KEY);
      this.dailyLocks = storedLocks ? JSON.parse(storedLocks) : [];
    } catch {
      this.glEntries = [];
      this.dailyLocks = [];
    }
    this.isInitialized = true;
  }

  private saveGL() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GL_STORAGE_KEY, JSON.stringify(this.glEntries));
    }
  }

  private saveLocks() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(this.dailyLocks));
    }
  }

  // --- AUTOMATIC DOMAIN EVENT BUS SUBSCRIPTIONS ---
  private setupDomainEventSubscriptions() {
    // 1. BookingCompleted Event
    domainEventBus.subscribe('BookingCompleted', async (event: DomainEvent) => {
      const { bookingRef, amount, paymentMethod, serviceName, customerName, locationId, locationName, appointmentDate, appointmentTime } = event.payload;
      if (amount <= 0) return;

      const pmLower = (paymentMethod || '').toLowerCase();
      let debitCode = '1030'; // Default UPI Wallet
      if (pmLower.includes('cash')) {
        debitCode = '1010'; // Cash in Hand
      } else if (pmLower.includes('card') && !pmLower.includes('gift')) {
        debitCode = '1040'; // Card Settlement Clearing
      } else if (pmLower.includes('gift')) {
        debitCode = '2020'; // Gift Card Liability
      } else if (pmLower.includes('membership')) {
        debitCode = '2030'; // Membership Liability
      }

      await this.postTransaction({
        centreId: locationId || event.centreId,
        centreName: locationName || event.centreName,
        debitAccountCode: debitCode,
        creditAccountCode: '3010', // Service Revenue
        amount: amount,
        moduleRef: 'booking',
        moduleRefId: bookingRef,
        bookingId: bookingRef,
        customerName: customerName,
        paymentMethod: paymentMethod,
        createdBy: event.user,
        remarks: `Booking Event: ${serviceName} for ${customerName}`,
        date: appointmentDate || event.timestamp.split('T')[0],
        time: appointmentTime && appointmentTime.includes(':') ? `${appointmentTime}:00` : undefined,
      });
    });

    // 2. ExpenseCreated Event
    domainEventBus.subscribe('ExpenseCreated', async (event: DomainEvent) => {
      const { id, category, description, amount, paidTo, paymentMethod } = event.payload;
      let expenseAccountCode = '4120';
      if (category === 'Utilities & Steam') expenseAccountCode = '4020';
      else if (category === 'Supplies & Oils') expenseAccountCode = '4110';
      else if (category === 'Staff Wages') expenseAccountCode = '4010';
      else if (category === 'Maintenance') expenseAccountCode = '4090';
      else if (category === 'Marketing') expenseAccountCode = '4060';

      const creditAccountCode = paymentMethod?.toLowerCase().includes('bank') ? '1020' : '1010';

      await this.postTransaction({
        centreId: event.centreId,
        centreName: event.centreName,
        debitAccountCode: expenseAccountCode,
        creditAccountCode: creditAccountCode,
        amount: amount,
        moduleRef: 'expense',
        moduleRefId: id,
        expenseId: id,
        paymentMethod: paymentMethod,
        createdBy: event.user,
        remarks: `Expense Event: ${category} - ${description} (Paid to ${paidTo})`,
        date: event.timestamp.split('T')[0],
      });
    });

    // 3. MembershipPurchased Event
    domainEventBus.subscribe('MembershipPurchased', async (event: DomainEvent) => {
      const { id, tierName, price } = event.payload;
      await this.postTransaction({
        centreId: event.centreId,
        centreName: event.centreName,
        debitAccountCode: '1010',
        creditAccountCode: '3030', // Membership Revenue
        amount: price,
        moduleRef: 'membership',
        moduleRefId: id,
        membershipId: id,
        createdBy: event.user,
        remarks: `Membership Sold Event: ${tierName}`,
        date: event.timestamp.split('T')[0],
      });
    });

    // 4. GiftCardSold Event
    domainEventBus.subscribe('GiftCardSold', async (event: DomainEvent) => {
      const { id, code, faceValue, recipientName } = event.payload;
      await this.postTransaction({
        centreId: event.centreId,
        centreName: event.centreName,
        debitAccountCode: '1010',
        creditAccountCode: '2020', // Gift Card Liability
        amount: faceValue,
        moduleRef: 'gift_card',
        moduleRefId: id,
        giftCardId: id,
        customerName: recipientName,
        createdBy: event.user,
        remarks: `Gift Card Sold Event: ${code} for ${recipientName}`,
        date: event.timestamp.split('T')[0],
      });
    });
  }

  // --- CHART OF ACCOUNTS UTILITIES ---
  getChartOfAccounts(): AccountHead[] {
    return [...CHART_OF_ACCOUNTS];
  }

  getAccountByCode(code: string): AccountHead | undefined {
    return CHART_OF_ACCOUNTS.find((a) => a.code === code);
  }

  // --- DAY LOCKING & REOPENING ---
  isDateLocked(centreId: string, date: string): boolean {
    this.init();
    const lock = this.dailyLocks.find((l) => l.centreId === centreId && l.date === date);
    return !!lock && lock.isLocked;
  }

  getLockRecord(centreId: string, date: string): DailyClosureLock | undefined {
    this.init();
    return this.dailyLocks.find((l) => l.centreId === centreId && l.date === date);
  }

  getOpeningCash(centreId: string, date: string): number {
    this.init();
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    const yesterdayLock = this.dailyLocks.find((l) => l.centreId === centreId && l.date === yesterdayStr);
    if (yesterdayLock && yesterdayLock.isLocked) {
      return yesterdayLock.actualCashCounted;
    }

    return 0;
  }

  // --- DOUBLE-ENTRY GL TRANSACTION POSTING ---
  async postTransaction(params: {
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
    createdBy: string;
    remarks: string;
    date?: string;
    time?: string;
  }): Promise<GeneralLedgerEntry> {
    this.init();
    const dateStr = params.date || new Date().toISOString().split('T')[0];
    const timeStr = params.time || new Date().toTimeString().split(' ')[0];

    if (this.isDateLocked(params.centreId, dateStr)) {
      throw new Error(`This day (${dateStr}) has already been closed and locked. Request Finance Reopen.`);
    }

    const debitAcc = this.getAccountByCode(params.debitAccountCode);
    const creditAcc = this.getAccountByCode(params.creditAccountCode);

    if (!debitAcc || !creditAcc) {
      throw new Error(`Invalid Chart of Accounts code: Debit (${params.debitAccountCode}), Credit (${params.creditAccountCode})`);
    }

    const entry: GeneralLedgerEntry = {
      transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: dateStr,
      time: timeStr,
      centreId: params.centreId,
      centreName: params.centreName,
      debitAccountCode: params.debitAccountCode,
      debitAccountName: debitAcc.name,
      creditAccountCode: params.creditAccountCode,
      creditAccountName: creditAcc.name,
      amount: Math.abs(params.amount),
      moduleRef: params.moduleRef,
      moduleRefId: params.moduleRefId,
      bookingId: params.bookingId,
      expenseId: params.expenseId,
      membershipId: params.membershipId,
      giftCardId: params.giftCardId,
      customerId: params.customerId,
      customerName: params.customerName,
      therapistId: params.therapistId,
      therapistName: params.therapistName,
      paymentMethod: params.paymentMethod,
      createdBy: params.createdBy,
      remarks: params.remarks,
      status: 'POSTED',
    };

    this.glEntries.unshift(entry);
    this.saveGL();
    return entry;
  }

  // --- REVERSAL ENTRY ---
  async reverseTransaction(transactionId: string, reason: string, user: string): Promise<GeneralLedgerEntry> {
    this.init();
    const original = this.glEntries.find((e) => e.transactionId === transactionId);
    if (!original) throw new Error('Transaction not found in General Ledger.');
    if (original.status === 'REVERSED') throw new Error('Transaction is already reversed.');

    if (this.isDateLocked(original.centreId, original.date)) {
      throw new Error(`Cannot reverse transaction on a locked date (${original.date}). Request Finance Reopen first.`);
    }

    original.status = 'REVERSED';

    const reversalEntry: GeneralLedgerEntry = {
      transactionId: `REV_${Date.now()}_${original.transactionId}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      centreId: original.centreId,
      centreName: original.centreName,
      debitAccountCode: original.creditAccountCode,
      debitAccountName: original.creditAccountName,
      creditAccountCode: original.debitAccountCode,
      creditAccountName: original.debitAccountName,
      amount: original.amount,
      moduleRef: original.moduleRef,
      moduleRefId: original.moduleRefId,
      createdBy: user,
      remarks: `Reversal of ${original.transactionId}: ${reason}`,
      status: 'POSTED',
      isReversal: true,
      reversalOfId: original.transactionId,
    };

    this.glEntries.unshift(reversalEntry);
    this.saveGL();
    return reversalEntry;
  }

  // --- INTERACTIVE DRILL-DOWN TRACEABILITY API ---
  getDrillDownTransactions(centreId?: string | null, category?: string, date?: string): GeneralLedgerEntry[] {
    this.init();
    const cid = !centreId || centreId === 'all' ? 'all' : centreId;

    return this.glEntries.filter((e) => {
      if (cid !== 'all' && e.centreId !== cid) return false;
      if (e.status !== 'POSTED') return false;
      if (date && e.date !== date) return false;

      if (category === 'revenue' || category === 'cashSales') {
        return ['3010', '3020', '3030', '3040', '3050', '3060'].includes(e.creditAccountCode);
      }
      if (category === 'expenses') {
        return e.debitAccountCode.startsWith('4');
      }
      if (category === 'bookings') {
        return e.moduleRef === 'booking';
      }
      if (category === 'memberships') {
        return e.moduleRef === 'membership';
      }
      if (category === 'giftCards') {
        return e.moduleRef === 'gift_card';
      }

      return true;
    });
  }

  // --- UNIFIED SINGLE SOURCE OF TRUTH (SSOT) METRICS API ---
  getTodayMetrics(centreId?: string | null) {
    this.init();
    const todayStr = new Date().toISOString().split('T')[0];
    const cid = !centreId || centreId === 'all' ? 'all' : centreId;
    const reg = this.getLiveDailyRegister(cid, todayStr);

    const todayPostings = this.glEntries.filter(
      (e) => (cid === 'all' || e.centreId === cid) && e.date === todayStr && e.status === 'POSTED'
    );

    const totalRevenue = todayPostings
      .filter((e) => ['3010', '3020', '3030', '3040', '3050', '3060'].includes(e.creditAccountCode))
      .reduce((sum, e) => sum + e.amount, 0);

    const bookingsCount = todayPostings.filter((e) => e.moduleRef === 'booking').length;
    const expensesTotal = reg.expenses;
    const cashInHand = reg.expectedClosingCash;

    return {
      todayDate: todayStr,
      totalRevenue,
      bookingsCount,
      expensesTotal,
      cashInHand,
      cashSales: reg.cashSales,
      cardSales: reg.cardSales,
      upiSales: reg.upiSales,
    };
  }

  getFinancialReports(centreId?: string | null, startDate?: string, endDate?: string) {
    this.init();
    const cid = !centreId || centreId === 'all' ? 'all' : centreId;

    const filtered = this.glEntries.filter((e) => {
      if (cid !== 'all' && e.centreId !== cid) return false;
      if (e.status !== 'POSTED') return false;
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    const totalIncome = filtered
      .filter((e) => e.creditAccountCode.startsWith('3'))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = filtered
      .filter((e) => e.debitAccountCode.startsWith('4'))
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      transactionCount: filtered.length,
    };
  }

  getGLTransactions(centreId?: string | null): GeneralLedgerEntry[] {
    this.init();
    if (!centreId || centreId === 'all') return [...this.glEntries];
    return this.glEntries.filter((e) => e.centreId === centreId);
  }

  getCashBook(centreId: string, date: string): CashBookEntry[] {
    this.init();
    const entries = this.glEntries.filter(
      (e) => (centreId === 'all' || e.centreId === centreId) && e.date === date && e.status === 'POSTED'
    );

    entries.sort((a, b) => a.time.localeCompare(b.time));

    const openingCash = this.getOpeningCash(centreId, date);
    let runningBalance = openingCash;

    const cashBook: CashBookEntry[] = [
      {
        id: `cb_open_${date}`,
        time: '00:00:00',
        type: 'OPENING',
        category: 'Opening Cash Balance',
        amount: openingCash,
        runningBalance: openingCash,
        remarks: 'Carried forward from yesterday\'s locked actual closing cash',
        refModule: 'adjustment',
        refId: `OPEN_${date}`,
      },
    ];

    for (const entry of entries) {
      const isCashDebit = entry.debitAccountCode === '1010';
      const isCashCredit = entry.creditAccountCode === '1010';

      if (isCashDebit) {
        runningBalance += entry.amount;
        cashBook.push({
          id: `cb_${entry.transactionId}`,
          time: entry.time,
          type: 'IN',
          category: entry.creditAccountName,
          amount: entry.amount,
          runningBalance,
          remarks: entry.remarks,
          refModule: entry.moduleRef,
          refId: entry.moduleRefId,
          lineage: entry,
        });
      } else if (isCashCredit) {
        runningBalance -= entry.amount;
        cashBook.push({
          id: `cb_${entry.transactionId}`,
          time: entry.time,
          type: 'OUT',
          category: entry.debitAccountName,
          amount: entry.amount,
          runningBalance,
          remarks: entry.remarks,
          refModule: entry.moduleRef,
          refId: entry.moduleRefId,
          lineage: entry,
        });
      }
    }

    return cashBook;
  }

  getLiveDailyRegister(centreId: string, date: string) {
    this.init();
    const openingCash = this.getOpeningCash(centreId, date);
    const dayTransactions = this.glEntries.filter(
      (e) => (centreId === 'all' || e.centreId === centreId) && e.date === date && e.status === 'POSTED'
    );

    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;
    let membershipCash = 0;
    let membershipCard = 0;
    let membershipUpi = 0;
    let giftCardSales = 0;
    let packageSales = 0;
    let expenses = 0;
    let salaryPayments = 0;
    let staffAdvances = 0;
    let vaultHandover = 0;
    let bankDeposits = 0;
    let refunds = 0;
    let customerAdvances = 0;

    for (const t of dayTransactions) {
      if (t.moduleRef === 'booking') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (t.debitAccountCode === '1010' || pm.includes('cash')) cashSales += t.amount;
        else if (t.debitAccountCode === '1040' || (pm.includes('card') && !pm.includes('gift'))) cardSales += t.amount;
        else upiSales += t.amount;
      } else if (t.moduleRef === 'membership') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (t.debitAccountCode === '1010' || pm.includes('cash')) membershipCash += t.amount;
        else if (t.debitAccountCode === '1040' || (pm.includes('card') && !pm.includes('gift'))) membershipCard += t.amount;
        else membershipUpi += t.amount;
      } else if (t.moduleRef === 'gift_card') {
        giftCardSales += t.amount;
      } else if (t.moduleRef === 'expense') {
        expenses += t.amount;
      } else if (t.moduleRef === 'salary') {
        salaryPayments += t.amount;
      } else if (t.moduleRef === 'advance') {
        staffAdvances += t.amount;
      } else if (t.moduleRef === 'handover') {
        vaultHandover += t.amount;
      } else if (t.moduleRef === 'bank_deposit') {
        bankDeposits += t.amount;
      } else if (t.moduleRef === 'refund') {
        refunds += t.amount;
      }
    }

    const expectedClosingCash =
      openingCash +
      cashSales +
      membershipCash +
      giftCardSales +
      customerAdvances -
      expenses -
      refunds -
      staffAdvances -
      vaultHandover -
      bankDeposits;

    const lock = this.getLockRecord(centreId, date);
    const actualCashCounted = lock ? lock.actualCashCounted : expectedClosingCash;
    const difference = actualCashCounted - expectedClosingCash;

    return {
      date,
      centreId,
      openingCash,
      cashSales,
      cardSales,
      upiSales,
      membershipCash,
      membershipCard,
      membershipUpi,
      giftCardSales,
      packageSales,
      expenses,
      salaryPayments,
      staffAdvances,
      vaultHandover,
      bankDeposits,
      refunds,
      discounts: 0,
      customerAdvances,
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

  async lockDay(params: {
    centreId: string;
    date: string;
    actualCashCounted: number;
    mismatchReason?: string;
    remarks?: string;
    closedBy: string;
  }): Promise<DailyClosureLock> {
    this.init();
    const liveReg = this.getLiveDailyRegister(params.centreId, params.date);

    const lockRecord: DailyClosureLock = {
      id: `lock_${params.centreId}_${params.date}`,
      centreId: params.centreId,
      date: params.date,
      openingCash: liveReg.openingCash,
      cashSales: liveReg.cashSales,
      cardSales: liveReg.cardSales,
      upiSales: liveReg.upiSales,
      membershipCash: liveReg.membershipCash,
      membershipCard: liveReg.membershipCard,
      membershipUpi: liveReg.membershipUpi,
      giftCardSales: liveReg.giftCardSales,
      packageSales: liveReg.packageSales,
      expenses: liveReg.expenses,
      salaryPayments: liveReg.salaryPayments,
      staffAdvances: liveReg.staffAdvances,
      vaultHandover: liveReg.vaultHandover,
      bankDeposits: liveReg.bankDeposits,
      refunds: liveReg.refunds,
      discounts: liveReg.discounts,
      customerAdvances: liveReg.customerAdvances,
      expectedClosingCash: liveReg.expectedClosingCash,
      actualCashCounted: params.actualCashCounted,
      difference: params.actualCashCounted - liveReg.expectedClosingCash,
      mismatchReason: params.mismatchReason,
      remarks: params.remarks,
      closedBy: params.closedBy,
      closedTime: new Date().toTimeString().split(' ')[0],
      isLocked: true,
    };

    const existingIndex = this.dailyLocks.findIndex((l) => l.centreId === params.centreId && l.date === params.date);
    if (existingIndex !== -1) {
      this.dailyLocks[existingIndex] = lockRecord;
    } else {
      this.dailyLocks.push(lockRecord);
    }

    this.saveLocks();
    return lockRecord;
  }

  async reopenDay(centreId: string, date: string, reason: string, user: string): Promise<DailyClosureLock> {
    this.init();
    const lock = this.dailyLocks.find((l) => l.centreId === centreId && l.date === date);
    if (!lock) throw new Error('No closure lock record found for this day.');

    lock.isLocked = false;
    lock.reopenedBy = user;
    lock.reopenedAt = new Date().toISOString();
    lock.reopenReason = reason;
    this.saveLocks();
    return lock;
  }

  getMonthlySpreadsheetRegister(centreId: string, yearMonthStr: string) {
    this.init();
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;
      const dayRegister = this.getLiveDailyRegister(centreId, dateStr);
      rows.push(dayRegister);
    }

    const cashSalesTotal = rows.reduce((s, r) => s + r.cashSales, 0);
    const cardSalesTotal = rows.reduce((s, r) => s + r.cardSales, 0);
    const upiSalesTotal = rows.reduce((s, r) => s + r.upiSales, 0);
    const membershipSalesTotal = rows.reduce((s, r) => s + r.membershipCash + r.membershipCard + r.membershipUpi, 0);
    const giftCardSalesTotal = rows.reduce((s, r) => s + r.giftCardSales, 0);
    const packageSalesTotal = rows.reduce((s, r) => s + r.packageSales, 0);

    const masterTotalSales = cashSalesTotal + cardSalesTotal + upiSalesTotal + membershipSalesTotal + giftCardSalesTotal + packageSalesTotal;

    const monthlyTotals = {
      totalSales: masterTotalSales,
      openingCash: rows[0]?.openingCash || 0,
      cashSales: cashSalesTotal,
      cardSales: cardSalesTotal,
      upiSales: upiSalesTotal,
      membershipCash: rows.reduce((s, r) => s + r.membershipCash, 0),
      membershipCard: rows.reduce((s, r) => s + r.membershipCard, 0),
      membershipUpi: rows.reduce((s, r) => s + r.membershipUpi, 0),
      giftCardSales: giftCardSalesTotal,
      packageSales: packageSalesTotal,
      customerAdvances: rows.reduce((s, r) => s + r.customerAdvances, 0),
      expenses: rows.reduce((s, r) => s + r.expenses, 0),
      salaryPayments: rows.reduce((s, r) => s + r.salaryPayments, 0),
      staffAdvances: rows.reduce((s, r) => s + r.staffAdvances, 0),
      vaultHandover: rows.reduce((s, r) => s + r.vaultHandover, 0),
      bankDeposits: rows.reduce((s, r) => s + r.bankDeposits, 0),
      refunds: rows.reduce((s, r) => s + r.refunds, 0),
      discounts: rows.reduce((s, r) => s + r.discounts, 0),
      expectedClosingCash: rows.reduce((s, r) => s + r.expectedClosingCash, 0),
      actualCashCounted: rows.reduce((s, r) => s + r.actualCashCounted, 0),
      difference: rows.reduce((s, r) => s + r.difference, 0),
      closingCash: rows[rows.length - 1]?.actualCashCounted || 0,
    };

    return {
      yearMonthStr,
      centreId,
      daysInMonth,
      rows,
      totals: monthlyTotals,
    };
  }
}

export const accountingEngine = new AccountingEngine();
