import {
  DailyMasterLedger,
  LedgerCellOverride,
  MonthlyRegisterRow,
  YearlyRegisterRow,
  MonthlyBookingRegisterRow,
} from '../types/daily-ledger.types';
import { salesService } from '@/features/sales/services/sales-service';
import { expenseService } from '@/features/expenses/services/expense-service';
import { bookingService } from '@/features/bookings/services/booking-service';
import { auditService } from '@/features/audit/services/audit-service';

export type {
  DailyMasterLedger,
  LedgerCellOverride,
  MonthlyRegisterRow,
  YearlyRegisterRow,
  MonthlyBookingRegisterRow,
};

const STORAGE_KEY = 'admin_master_daily_ledgers_v5_hierarchical';

export const INITIAL_LEDGERS: DailyMasterLedger[] = [];

class DailyLedgerService {
  private ledgers: DailyMasterLedger[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.ledgers = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.ledgers = stored ? JSON.parse(stored) : [];
    } catch {
      this.ledgers = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ledgers));
    }
  }

  async getMasterLedger(centreId: string, centreName: string, date: string): Promise<DailyMasterLedger> {
    this.init();
    let existing = this.ledgers.find((l) => l.centreId === centreId && l.date === date);

    // Fetch real-time sales & expense data
    const sales = await salesService.getSalesByCentre(centreId);
    const expenses = await expenseService.getExpenses(centreId);

    // Sum transactions for selected date
    const dateSales = sales.filter((s) => s.createdAt && s.createdAt.startsWith(date));
    const cashSalesSum = dateSales.filter((s) => s.paymentMethod === 'Cash' || s.paymentMethod === 'Cash at Desk').reduce((sum, s) => sum + s.amount, 0);
    const cardSalesSum = dateSales.filter((s) => s.paymentMethod === 'Card' || s.paymentMethod === 'Credit Card').reduce((sum, s) => sum + s.amount, 0);
    const upiSalesSum = dateSales.filter((s) => s.paymentMethod === 'UPI' || s.paymentMethod === 'UPI / Razorpay').reduce((sum, s) => sum + s.amount, 0);

    const dateExpenses = expenses.filter((e) => e.date === date);
    const expensesSum = dateExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Previous day carry-forward
    const previousLedgers = this.ledgers
      .filter((l) => l.centreId === centreId && l.date < date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const carriedOpeningCash = previousLedgers.length > 0 ? previousLedgers[0].actualCash : 0;

    if (!existing) {
      existing = {
        id: `dlg_${date.replace(/-/g, '')}_${centreId}`,
        date,
        centreId,
        centreName,
        openingCash: carriedOpeningCash,
        cashSales: cashSalesSum,
        cardSales: cardSalesSum,
        upiSales: upiSalesSum,
        membershipCash: 0,
        membershipCard: 0,
        membershipOnline: 0,
        giftCardSales: 0,
        expenses: expensesSum,
        staffAdvances: 0,
        salaryPayments: 0,
        vaultHandover: 0,
        refunds: 0,
        totalGrossRevenue: cashSalesSum + cardSalesSum + upiSalesSum,
        totalCashIn: carriedOpeningCash + cashSalesSum,
        totalCashOut: expensesSum,
        expectedCash: carriedOpeningCash + cashSalesSum - expensesSum,
        actualCash: carriedOpeningCash + cashSalesSum - expensesSum,
        difference: 0,
        isFinalised: false,
        overrides: {},
      };
      this.ledgers.unshift(existing);
      this.save();
    } else {
      // Sync live numbers unless overridden
      if (!existing.isFinalised) {
        existing.cashSales = existing.overrides['cashSales'] ? existing.overrides['cashSales'].overriddenValue : cashSalesSum;
        existing.cardSales = existing.overrides['cardSales'] ? existing.overrides['cardSales'].overriddenValue : cardSalesSum;
        existing.upiSales = existing.overrides['upiSales'] ? existing.overrides['upiSales'].overriddenValue : upiSalesSum;
        existing.expenses = existing.overrides['expenses'] ? existing.overrides['expenses'].overriddenValue : expensesSum;

        existing.totalGrossRevenue = existing.cashSales + existing.cardSales + existing.upiSales + existing.membershipCash + existing.giftCardSales;
        existing.expectedCash = existing.openingCash + existing.cashSales + existing.membershipCash - (existing.expenses + existing.staffAdvances + existing.vaultHandover + existing.refunds);
        existing.difference = existing.actualCash - existing.expectedCash;
        this.save();
      }
    }

    return { ...existing };
  }

  // LEVEL 2: Monthly Financial Register (1 row per day of the month)
  async getMonthlyFinancialRegister(centreId: string, yearMonth: string): Promise<MonthlyRegisterRow[]> {
    this.init();
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const rows: MonthlyRegisterRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dl = await this.getMasterLedger(centreId, 'Centre', dateStr);

      rows.push({
        date: dateStr,
        openingCash: dl.openingCash,
        cashSales: dl.cashSales,
        cardSales: dl.cardSales,
        upiSales: dl.upiSales,
        membershipCash: dl.membershipCash,
        membershipCard: dl.membershipCard,
        membershipOnline: dl.membershipOnline,
        giftCardSales: dl.giftCardSales,
        expenses: dl.expenses,
        staffAdvances: dl.staffAdvances,
        salaryPayments: dl.salaryPayments,
        vaultHandover: dl.vaultHandover,
        refunds: dl.refunds,
        expectedClosingCash: dl.expectedCash,
        actualClosingCash: dl.actualCash,
        difference: dl.difference,
        remarks: dl.differenceReason || (dl.isFinalised ? 'Finalised' : 'Open'),
        isFinalised: dl.isFinalised,
      });
    }

    return rows;
  }

  // LEVEL 3: Yearly Register (1 row per month Jan-Dec)
  async getYearlyRegister(centreId: string, yearStr: string): Promise<YearlyRegisterRow[]> {
    this.init();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const rows: YearlyRegisterRow[] = [];

    for (let m = 1; m <= 12; m++) {
      const yearMonth = `${yearStr}-${String(m).padStart(2, '0')}`;
      const monthRows = await this.getMonthlyFinancialRegister(centreId, yearMonth);
      const bookings = await bookingService.getBookings(centreId);
      const monthBookings = bookings.filter((b) => b.appointmentDate.startsWith(yearMonth));

      const revenue = monthRows.reduce((sum, r) => sum + r.cashSales + r.cardSales + r.upiSales + r.membershipCash + r.membershipCard + r.membershipOnline + r.giftCardSales, 0);
      const expenses = monthRows.reduce((sum, r) => sum + r.expenses + r.staffAdvances + r.salaryPayments, 0);
      const membershipSales = monthRows.reduce((sum, r) => sum + r.membershipCash + r.membershipCard + r.membershipOnline, 0);
      const giftCardSales = monthRows.reduce((sum, r) => sum + r.giftCardSales, 0);
      const cashDifferences = monthRows.reduce((sum, r) => sum + r.difference, 0);

      const bookingsCount = monthBookings.length;
      const avgTicketSize = bookingsCount > 0 ? Math.round(revenue / bookingsCount) : 0;

      rows.push({
        month: yearMonth,
        monthName: `${monthNames[m - 1]} ${yearStr}`,
        revenue,
        expenses,
        profit: revenue - expenses,
        membershipSales,
        giftCardSales,
        bookingsCount,
        avgTicketSize,
        cashDifferences,
      });
    }

    return rows;
  }

  // MONTHLY BOOKING REGISTER (1 row per day of the month)
  async getMonthlyBookingRegister(centreId: string, yearMonth: string): Promise<MonthlyBookingRegisterRow[]> {
    this.init();
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const allBookings = await bookingService.getBookings(centreId);

    const rows: MonthlyBookingRegisterRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = allBookings.filter((b) => b.appointmentDate === dateStr);

      const totalBookings = dayBookings.length;
      const walkIns = dayBookings.filter((b) => b.paymentMethod === 'Cash at Desk').length;
      const onlineBookings = dayBookings.filter((b) => b.paymentMethod === 'UPI / Razorpay' || b.paymentMethod === 'Membership Pass').length;
      const completed = dayBookings.filter((b) => b.bookingStatus === 'Completed' || b.bookingStatus === 'Confirmed').length;
      const cancelled = dayBookings.filter((b) => b.bookingStatus === 'Cancelled').length;
      const noShows = dayBookings.filter((b) => b.bookingStatus === 'Pending').length;
      const revenue = dayBookings.reduce((sum, b) => sum + b.amount, 0);

      // Max capacity per day assumed to be 20 slots
      const maxSlots = 20;
      const occupancyPercentage = Math.min(100, Math.round((completed / maxSlots) * 100));

      rows.push({
        date: dateStr,
        totalBookings,
        walkIns,
        onlineBookings,
        completed,
        cancelled,
        noShows,
        revenue,
        occupancyPercentage,
      });
    }

    return rows;
  }

  async overrideCell(
    ledgerId: string,
    cellKey: keyof DailyMasterLedger,
    cellId: string,
    newValue: number,
    reason: string,
    userEmail: string
  ): Promise<DailyMasterLedger> {
    this.init();
    const ledger = this.ledgers.find((l) => l.id === ledgerId);
    if (!ledger) throw new Error('Master ledger record not found.');
    if (ledger.isFinalised) throw new Error('Cannot override values in a finalised/locked ledger.');

    const originalValue = (ledger[cellKey] as unknown as number) || 0;

    (ledger as unknown as Record<string, unknown>)[cellKey] = newValue;
    ledger.overrides[cellId] = {
      cellId,
      originalValue,
      overriddenValue: newValue,
      overriddenBy: userEmail,
      reason,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    // Recalculate totals
    ledger.totalGrossRevenue = ledger.cashSales + ledger.cardSales + ledger.upiSales + ledger.membershipCash + ledger.giftCardSales;
    ledger.expectedCash = ledger.openingCash + ledger.cashSales + ledger.membershipCash - (ledger.expenses + ledger.staffAdvances + ledger.vaultHandover + ledger.refunds);
    ledger.difference = ledger.actualCash - ledger.expectedCash;

    this.save();

    // Log in Audit Trail
    await auditService.logAction({
      centreId: ledger.centreId,
      centreName: ledger.centreName,
      userId: 'u_override',
      userEmail,
      action: 'UPDATE',
      targetTable: 'daily_master_ledger',
      recordId: `${ledgerId}:${cellId}`,
      details: `MANUAL CELL OVERRIDE (${cellId}). Old Value: ₹${originalValue}, New Value: ₹${newValue}. Reason: ${reason}`,
    });

    return { ...ledger };
  }

  async finaliseLedger(
    ledgerId: string,
    actualCash: number,
    differenceReason: string,
    userEmail: string
  ): Promise<DailyMasterLedger> {
    this.init();
    const ledger = this.ledgers.find((l) => l.id === ledgerId);
    if (!ledger) throw new Error('Master ledger record not found.');

    ledger.actualCash = actualCash;
    ledger.difference = actualCash - ledger.expectedCash;
    ledger.differenceReason = differenceReason;
    ledger.isFinalised = true;
    ledger.finalisedBy = userEmail;
    ledger.finalisedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.save();

    await auditService.logAction({
      centreId: ledger.centreId,
      centreName: ledger.centreName,
      userId: 'u_finalise',
      userEmail,
      action: 'CREATE',
      targetTable: 'daily_master_ledger',
      recordId: ledgerId,
      details: `FINALISED Daily Master Ledger for ${ledger.date}. Expected: ₹${ledger.expectedCash}, Actual: ₹${actualCash}, Mismatch: ₹${ledger.difference}`,
    });

    return { ...ledger };
  }
}

export const dailyLedgerService = new DailyLedgerService();
