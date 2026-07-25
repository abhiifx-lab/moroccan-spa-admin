export interface DenominationBreakdown {
  n2000: number;
  n500: number;
  n200: number;
  n100: number;
  n50: number;
  n20: number;
  n10: number;
  coins: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ManualEntry {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  remarks: string;
  employeeName: string;
  timestamp: string;
}

export type ClosingStatus = 'In Progress' | 'Closed' | 'Pending Approval' | 'Reopened';

export interface DailyClosingRecord {
  id: string;
  date: string;
  centreId: string;
  centreName: string;
  openingCash: number;
  cashSales: number;
  membershipCash: number;
  packageCash: number;
  manualIncome: number;
  expenses: number;
  refunds: number;
  vendorPayouts: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  differenceReason?: string;
  differenceRemarks?: string;
  denominations: DenominationBreakdown;
  checklist: ChecklistItem[];
  manualEntries: ManualEntry[];
  status: ClosingStatus;
  closedBy?: string;
  closedAt?: string;
  approvedBy?: string;
  reopenedBy?: string;
  reopenedReason?: string;
}
