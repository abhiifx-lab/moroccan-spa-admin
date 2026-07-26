import { DailyClosingRecord, DenominationBreakdown, ChecklistItem, ClosingStatus } from '../types/daily-closing.types';
import { auditService } from '@/features/audit/services/audit-service';
import { createClient } from '@/lib/supabase/client';

export type { DailyClosingRecord, DenominationBreakdown, ChecklistItem, ClosingStatus };

const STORAGE_KEY = 'admin_daily_closings_v1';

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 'chk_1', label: 'All appointment bookings checked in or completed in system', completed: true },
  { id: 'chk_2', label: 'Card POS terminal batch settled and receipt printed', completed: true },
  { id: 'chk_3', label: 'Fresh towels & linens counted and logged', completed: false },
  { id: 'chk_4', label: 'Eucalyptus steam generators turned off & drained', completed: false },
  { id: 'chk_5', label: 'Cash drawer counted, reconciled & locked in vault', completed: false },
];

export const INITIAL_CLOSINGS: DailyClosingRecord[] = [
  {
    id: 'cls_20260724_locpallasio',
    date: '2026-07-24',
    centreId: 'loc_pallasio',
    centreName: 'Moroccan Spa - Phoenix Palassio',
    openingCash: 5000,
    cashSales: 18500,
    membershipCash: 5000,
    packageCash: 0,
    manualIncome: 0,
    expenses: 4500,
    refunds: 0,
    vendorPayouts: 0,
    expectedCash: 24000,
    actualCash: 24000,
    difference: 0,
    denominations: { n2000: 0, n500: 40, n200: 15, n100: 10, n50: 0, n20: 0, n10: 0, coins: 0 },
    checklist: INITIAL_CHECKLIST.map((c) => ({ ...c, completed: true })),
    manualEntries: [],
    status: 'Closed',
    closedBy: 'Fatima Zohra',
    closedAt: '2026-07-24 21:15:00',
  },
  {
    id: 'cls_20260724_locholidayinn',
    date: '2026-07-24',
    centreId: 'loc_holidayinn',
    centreName: 'Moroccan Spa - Holiday Inn',
    openingCash: 3500,
    cashSales: 12400,
    membershipCash: 0,
    packageCash: 0,
    manualIncome: 0,
    expenses: 2100,
    refunds: 0,
    vendorPayouts: 0,
    expectedCash: 13800,
    actualCash: 13800,
    difference: 0,
    denominations: { n2000: 0, n500: 20, n200: 15, n100: 8, n50: 0, n20: 0, n10: 0, coins: 0 },
    checklist: INITIAL_CHECKLIST.map((c) => ({ ...c, completed: true })),
    manualEntries: [],
    status: 'Closed',
    closedBy: 'Priya Sharma',
    closedAt: '2026-07-24 21:05:00',
  },
];

class DailyClosingService {
  private closings: DailyClosingRecord[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.closings = [...INITIAL_CLOSINGS];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.closings = stored ? JSON.parse(stored) : [...INITIAL_CLOSINGS];
    } catch {
      this.closings = [...INITIAL_CLOSINGS];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.closings));
    }
  }

  async getClosingRecord(centreId: string, centreName: string, date: string): Promise<DailyClosingRecord> {
    this.init();
    const existing = this.closings.find((c) => c.centreId === centreId && c.date === date);
    if (existing) return { ...existing };

    // Find previous day's closing cash to carry forward as opening cash
    const previousClosings = this.closings
      .filter((c) => c.centreId === centreId && c.date < date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const carriedOpeningCash = previousClosings.length > 0 ? previousClosings[0].actualCash : 5000;

    const newRecord: DailyClosingRecord = {
      id: `cls_${date.replace(/-/g, '')}_${centreId}`,
      date,
      centreId,
      centreName,
      openingCash: carriedOpeningCash,
      cashSales: 14500,
      membershipCash: 3000,
      packageCash: 0,
      manualIncome: 0,
      expenses: 1200,
      refunds: 0,
      vendorPayouts: 0,
      expectedCash: carriedOpeningCash + 14500 + 3000 - 1200,
      actualCash: carriedOpeningCash + 14500 + 3000 - 1200,
      difference: 0,
      denominations: { n2000: 0, n500: 30, n200: 20, n100: 23, n50: 0, n20: 0, n10: 0, coins: 0 },
      checklist: INITIAL_CHECKLIST.map((item) => ({ ...item })),
      manualEntries: [],
      status: 'In Progress',
    };

    return newRecord;
  }

  async getAllClosings(): Promise<DailyClosingRecord[]> {
    this.init();
    return [...this.closings];
  }

  async submitClosing(record: DailyClosingRecord, userEmail: string): Promise<DailyClosingRecord> {
    this.init();

    const den = record.denominations;
    const computedActual =
      den.n2000 * 2000 +
      den.n500 * 500 +
      den.n200 * 200 +
      den.n100 * 100 +
      den.n50 * 50 +
      den.n20 * 20 +
      den.n10 * 10 +
      den.coins;

    const expected =
      record.openingCash +
      record.cashSales +
      record.membershipCash +
      record.packageCash +
      record.manualIncome -
      record.expenses -
      record.refunds -
      record.vendorPayouts;

    const diff = computedActual - expected;

    const isHighDiff = Math.abs(diff) > 500;
    const finalStatus: ClosingStatus = isHighDiff ? 'Pending Approval' : 'Closed';

    const updatedRecord: DailyClosingRecord = {
      ...record,
      actualCash: computedActual,
      expectedCash: expected,
      difference: diff,
      status: finalStatus,
      closedBy: userEmail,
      closedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const index = this.closings.findIndex((c) => c.id === record.id);
    if (index !== -1) this.closings[index] = updatedRecord;
    else this.closings.unshift(updatedRecord);

    this.save();

    // PERSIST TO SUPABASE DATABASE (SINGLE SOURCE OF TRUTH)
    try {
      const supabase = createClient();
      if (supabase && 'from' in supabase) {
        const centreUuid = record.centreId === 'loc_holidayinn'
          ? 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
          : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        const closingPayload = {
          date: record.date,
          centre_id: centreUuid,
          centre_name: record.centreName,
          opening_cash: record.openingCash,
          cash_sales: record.cashSales,
          membership_cash: record.membershipCash,
          package_cash: record.packageCash,
          expenses: record.expenses,
          expected_cash: expected,
          actual_cash: computedActual,
          difference: diff,
          denominations: record.denominations,
          status: finalStatus,
          closed_by: userEmail,
          closed_at: new Date().toISOString(),
        };

        console.log('Attempting Supabase Daily Closing Upsert:', closingPayload);
        await supabase.from('daily_closings').upsert([closingPayload], { onConflict: 'centre_id,date' });
      }
    } catch (dbErr) {
      console.warn('Supabase Daily Closing insert warning:', dbErr);
    }

    await auditService.logAction({
      centreId: record.centreId,
      centreName: record.centreName,
      userId: 'u_desk',
      userEmail,
      action: 'CREATE',
      targetTable: 'daily_closings',
      recordId: record.id,
      details: `Submitted Daily Operations Closing for ${record.date}. Status: ${finalStatus}. Cash Diff: ₹${diff}`,
    });

    return updatedRecord;
  }

  async approveClosing(recordId: string, managerEmail: string): Promise<DailyClosingRecord> {
    this.init();
    const item = this.closings.find((c) => c.id === recordId);
    if (!item) throw new Error('Closing record not found.');

    item.status = 'Closed';
    item.approvedBy = managerEmail;
    this.save();

    await auditService.logAction({
      centreId: item.centreId,
      centreName: item.centreName,
      userId: 'u_mgr',
      userEmail: managerEmail,
      action: 'UPDATE',
      targetTable: 'daily_closings',
      recordId: item.id,
      details: `Manager approved Cash Difference (₹${item.difference}) for ${item.date} daily closing.`,
    });

    return item;
  }

  async reopenDay(recordId: string, adminEmail: string, reason: string): Promise<DailyClosingRecord> {
    this.init();
    const item = this.closings.find((c) => c.id === recordId);
    if (!item) throw new Error('Closing record not found.');

    item.status = 'Reopened';
    item.reopenedBy = adminEmail;
    item.reopenedReason = reason;
    this.save();

    await auditService.logAction({
      centreId: item.centreId,
      centreName: item.centreName,
      userId: 'u_admin',
      userEmail: adminEmail,
      action: 'UPDATE',
      targetTable: 'daily_closings',
      recordId: item.id,
      details: `REOPENED locked day (${item.date}). Reason: ${reason}`,
    });

    return item;
  }
}

export const dailyClosingService = new DailyClosingService();
