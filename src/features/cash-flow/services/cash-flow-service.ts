import { auditService } from '@/features/audit/services/audit-service';
import { operationsEngine } from '@/features/operations/services/operations-engine';

export type CashMovementType = 'Cash In' | 'Cash Out';

export interface CashFlowRecord {
  id: string;
  date: string;
  centreId: string;
  centreName: string;
  type: CashMovementType;
  category:
    | 'Cash Sales (Auto-linked)'
    | 'Owner Capital Added'
    | 'Cash Received'
    | 'Cash Transfer In'
    | 'Opening Cash / Float Top-up'
    | 'Petty Cash Added'
    | 'Bank Withdrawal'
    | 'Cash Expenses (Auto-linked)'
    | 'Owner Cash Withdrawal'
    | 'Cash Transfer Out'
    | 'Bank Cash Deposit'
    | 'Petty Cash Removed'
    | 'Refund Paid in Cash'
    | 'Other Movement';
  amount: number;
  runningBalanceAfter: number;
  reason: string;
  referenceCode?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

const STORAGE_KEY = 'admin_cash_register_records_v3_clean';

export const INITIAL_CASH_FLOW: CashFlowRecord[] = [];

class CashFlowService {
  private records: CashFlowRecord[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.records = [...INITIAL_CASH_FLOW];
      return;
    }
    try {
      localStorage.removeItem('admin_cash_flow_v1');
      localStorage.removeItem('admin_cash_register_records_v1');
      localStorage.removeItem('admin_cash_register_records_v2');

      const stored = localStorage.getItem(STORAGE_KEY);
      this.records = stored ? JSON.parse(stored) : [...INITIAL_CASH_FLOW];
    } catch {
      this.records = [...INITIAL_CASH_FLOW];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    }
  }

  async getRecords(centreIdFilter?: string | null): Promise<CashFlowRecord[]> {
    this.init();
    if (!centreIdFilter || centreIdFilter === 'all') {
      return [...this.records];
    }
    return this.records.filter((r) => r.centreId === centreIdFilter);
  }

  // Running Cash Register Balance per Centre from Operations Engine
  async getRunningCashBalance(centreIdFilter?: string | null): Promise<number> {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(centreIdFilter);
    return metrics.cashInHand;
  }

  async addRecord(
    data: Omit<CashFlowRecord, 'id' | 'createdAt' | 'runningBalanceAfter'>
  ): Promise<CashFlowRecord> {
    this.init();

    // 1. Post to Operations Engine SSOT
    await operationsEngine.addTransaction({
      type: data.type === 'Cash In' ? 'cash_in' : 'cash_out',
      centreId: data.centreId,
      centreName: data.centreName,
      amount: data.amount,
      paymentMethod: 'cash',
      refCode: data.referenceCode,
      category: data.category,
      remarks: `${data.category}: ${data.reason}`,
      user: data.createdBy,
      date: data.date,
    });

    const currentRunningBal = await this.getRunningCashBalance(data.centreId);

    const newRecord: CashFlowRecord = {
      ...data,
      id: `cf_${Date.now()}`,
      runningBalanceAfter: currentRunningBal,
      createdAt: new Date().toISOString(),
    };

    this.records.unshift(newRecord);
    this.save();

    await auditService.logAction({
      centreId: data.centreId,
      centreName: data.centreName,
      userId: 'u_desk',
      userEmail: data.createdBy,
      action: 'CREATE',
      targetTable: 'cash_register',
      recordId: newRecord.id,
      details: `Cash Register ${data.type}: ₹${data.amount.toLocaleString('en-IN')} (${data.category} - ${data.reason}). New Register Balance: ₹${currentRunningBal.toLocaleString('en-IN')}`,
    });

    return newRecord;
  }

  async getCashRegisterSummary(centreIdFilter?: string | null) {
    const list = await this.getRecords(centreIdFilter);
    const runningCashBalance = await this.getRunningCashBalance(centreIdFilter);

    const totalCashIn = list
      .filter((r) => r.type === 'Cash In')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalCashOut = list
      .filter((r) => r.type === 'Cash Out')
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      runningCashBalance,
      totalCashIn,
      totalCashOut,
      netCashMovement: totalCashIn - totalCashOut,
      recordCount: list.length,
    };
  }
}

export const cashFlowService = new CashFlowService();
