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
  | 'adjustment';

export interface GeneralLedgerEntry {
  transactionId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  centreId: string;
  centreName: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  moduleRef: ModuleRef;
  moduleRefId: string;

  // Rich Financial Lineage Metadata
  bookingId?: string;
  expenseId?: string;
  membershipId?: string;
  giftCardId?: string;
  customerId?: string;
  customerName?: string;
  staffId?: string;
  therapistId?: string;
  therapistName?: string;
  invoiceId?: string;
  paymentId?: string;
  paymentMethod?: string;

  createdBy: string;
  approvedBy?: string;
  remarks: string;
  status: 'POSTED' | 'REVERSED';
  isReversal?: boolean;
  reversalOfId?: string;
}

export interface CashBookEntry {
  id: string;
  time: string;
  type: 'IN' | 'OUT' | 'OPENING';
  category: string;
  amount: number;
  runningBalance: number;
  remarks: string;
  refModule: ModuleRef;
  refId: string;
  lineage?: GeneralLedgerEntry;
}

export interface DailyClosureLock {
  id: string;
  centreId: string;
  date: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  membershipCash: number;
  membershipCard: number;
  membershipUpi: number;
  giftCardSales: number;
  packageSales: number;
  expenses: number;
  salaryPayments: number;
  staffAdvances: number;
  vaultHandover: number;
  bankDeposits: number;
  refunds: number;
  discounts: number;
  customerAdvances: number;
  expectedClosingCash: number;
  actualCashCounted: number;
  difference: number;
  mismatchReason?: string;
  remarks?: string;
  closedBy: string;
  closedTime: string;
  isLocked: boolean;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;
}
