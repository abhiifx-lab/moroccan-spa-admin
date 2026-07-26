import { auditService } from '@/features/audit/services/audit-service';

export type CashMovementType = 'Cash In' | 'Cash Out';

export interface CashFlowRecord {
  id: string;
  date: string;
  centreId: string;
  centreName: string;
  type: CashMovementType;
  category:
    | 'Owner Capital Added'
    | 'Inter-Centre Transfer Received'
    | 'Bank Cash Withdrawal'
    | 'Opening Float Top-up'
    | 'Petty Cash Received'
    | 'Owner Cash Withdrawal'
    | 'Bank Cash Deposit'
    | 'Inter-Centre Transfer Sent'
    | 'Emergency Out'
    | 'Other Movement';
  amount: number;
  reason: string;
  referenceCode?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

const STORAGE_KEY = 'admin_cash_flow_records_v1';

export const INITIAL_CASH_FLOW: CashFlowRecord[] = [
  {
    id: 'cf_1',
    date: new Date().toISOString().split('T')[0],
    centreId: 'loc_pallasio',
    centreName: 'Moroccan Spa - Phoenix Palassio',
    type: 'Cash In',
    category: 'Opening Float Top-up',
    amount: 10000,
    reason: 'Morning Reception Register Cash Float Addition',
    referenceCode: 'FLT-2026-001',
    remarks: 'Added ₹10,000 cash float to main reception drawer',
    createdBy: 'superadmin@moroccanspa.in',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf_2',
    date: new Date().toISOString().split('T')[0],
    centreId: 'loc_holidayinn',
    centreName: 'Moroccan Spa - Holiday Inn',
    type: 'Cash Out',
    category: 'Bank Cash Deposit',
    amount: 25000,
    reason: 'End-of-day Excess Cash Deposited to ICICI Bank Account',
    referenceCode: 'BNK-DEP-9921',
    remarks: 'Deposited counter cash to company bank account',
    createdBy: 'holidayinn@moroccanspa.in',
    createdAt: new Date().toISOString(),
  },
];

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

  async addRecord(
    data: Omit<CashFlowRecord, 'id' | 'createdAt'>
  ): Promise<CashFlowRecord> {
    this.init();
    const newRecord: CashFlowRecord = {
      ...data,
      id: `cf_${Date.now()}`,
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
      targetTable: 'cash_flow',
      recordId: newRecord.id,
      details: `Recorded Cash Movement (${data.type}): ₹${data.amount.toLocaleString('en-IN')} - ${data.category} (${data.reason})`,
    });

    return newRecord;
  }

  async getCashFlowSummary(centreIdFilter?: string | null) {
    const list = await this.getRecords(centreIdFilter);
    const totalCashIn = list
      .filter((r) => r.type === 'Cash In')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalCashOut = list
      .filter((r) => r.type === 'Cash Out')
      .reduce((sum, r) => sum + r.amount, 0);

    const netCashMovement = totalCashIn - totalCashOut;

    return {
      totalCashIn,
      totalCashOut,
      netCashMovement,
      recordCount: list.length,
    };
  }
}

export const cashFlowService = new CashFlowService();
