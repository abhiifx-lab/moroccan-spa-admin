// ============================================================
// DEPRECATED OPERATIONS ENGINE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor to a Single Source of Truth
// (BusinessDayEngine & UnifiedTransactionPipeline).
//
// Do not import or use this engine. All calculations originate from:
//   import { businessDayEngine, transactionPipeline } from '@/features/business-day-engine';
// ============================================================

export interface OperationTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  time: string;
  paymentMethod: string;
  remarks: string;
  refCode: string;
  customerName: string;
  [key: string]: any;
}

export interface DailyRegisterResult {
  date: string;
  centreId: string;
  centreName: string;
  financialRevenue: number;
  upi1Sales: number;
  upi2Sales: number;
  cashSales: number;
  cardSales: number;
  membershipCash: number;
  membershipCard: number;
  membershipUpi: number;
  giftCardSales: number;
  cashInOther: number;
  openingCash: number;
  totalCashInflows: number;
  expenses: number;
  cashHandover: number;
  refunds: number;
  expectedClosingCash: number;
  actualCashCounted: number;
  mismatchReason: string;
  remarks: string;
  isLocked: boolean;
  transactions: OperationTransaction[];
  [key: string]: any;
}

export interface CentreOverviewItem {
  id: string;
  shortName: string;
  status: string;
  sales: number;
  cash: number;
  upi: number;
  card: number;
  expenses: number;
  cashCounted: number;
  remarks?: string;
  [key: string]: any;
}

export interface MultiCentreMonthlySummary {
  rows: {
    date: string;
    luluSales: number;
    palassioSales: number;
    holidaySales: number;
    orgTotal: number;
    [key: string]: any;
  }[];
  totals: {
    luluSales: number;
    palassioSales: number;
    holidaySales: number;
    orgTotal: number;
    [key: string]: any;
  };
}

export interface SingleCentreMonthlyRegister {
  rows: DailyRegisterResult[];
  totals: {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    upi1Sales: number;
    upi2Sales: number;
    membershipSales: number;
    giftCardSales: number;
    otherIncome: number;
    expenses: number;
    cashHandover: number;
    refunds: number;
    openingCash: number;
    closingCash: number;
    closedDaysCount: number;
    totalDaysCount: number;
    [key: string]: any;
  };
}

/**
 * @deprecated Obsolete calculation engine. Use @/features/business-day-engine instead.
 */
export class OperationsEngine {
  constructor() {
    // Neutralized legacy shim
  }

  async fetchTransactions(dateStr?: string): Promise<void> {
    return Promise.resolve();
  }

  getTransactions(centreId?: string | null): OperationTransaction[] {
    return [];
  }

  getMetrics(centreId?: string | null): any {
    return {};
  }

  getFilteredTransactions(centreId?: string | null, category?: string, dateStr?: string): OperationTransaction[] {
    return [];
  }

  getCentresOverview(dateStr: string): CentreOverviewItem[] {
    return [];
  }

  getDailyRegister(centreId: string, dateStr: string): DailyRegisterResult {
    return {
      date: dateStr,
      centreId,
      centreName: 'Moroccan Spa',
      financialRevenue: 0,
      upi1Sales: 0,
      upi2Sales: 0,
      cashSales: 0,
      cardSales: 0,
      membershipCash: 0,
      membershipCard: 0,
      membershipUpi: 0,
      giftCardSales: 0,
      cashInOther: 0,
      openingCash: 0,
      totalCashInflows: 0,
      expenses: 0,
      cashHandover: 0,
      refunds: 0,
      expectedClosingCash: 0,
      actualCashCounted: 0,
      mismatchReason: '',
      remarks: '',
      isLocked: false,
      transactions: [],
    };
  }

  getMultiCentreMonthlySummary(yearMonthStr: string): MultiCentreMonthlySummary {
    return { rows: [], totals: { luluSales: 0, palassioSales: 0, holidaySales: 0, orgTotal: 0 } };
  }

  getMonthlyRegister(centreId: string, yearMonthStr: string): SingleCentreMonthlyRegister {
    return {
      rows: [],
      totals: {
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        upi1Sales: 0,
        upi2Sales: 0,
        membershipSales: 0,
        giftCardSales: 0,
        otherIncome: 0,
        expenses: 0,
        cashHandover: 0,
        refunds: 0,
        openingCash: 0,
        closingCash: 0,
        closedDaysCount: 0,
        totalDaysCount: 0,
      },
    };
  }

  getCashBook(centreId: string, dateStr: string): any[] {
    return [];
  }

  async lockDay(params: any): Promise<any> {
    return { success: true };
  }

  async unlockDay(params: any): Promise<any> {
    return { success: true };
  }

  seedMonthTestData(): { success: boolean; transactionsCount: number; [key: string]: any } {
    return { success: true, transactionsCount: 0 };
  }
}

export const operationsEngine: OperationsEngine & { [key: string]: any } = new OperationsEngine();



