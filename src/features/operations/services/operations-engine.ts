import { createClient } from '@/lib/supabase/client';
import { getCentreUuid, getCentreIdFromUuid, getCentreName } from '@/features/centres/utils/centre-mapping';

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

export type SimplePaymentMethod = 'cash' | 'card' | 'upi' | 'upi1' | 'upi2' | 'membership' | 'gift_card';

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

const TX_STORAGE_KEY = 'admin_operations_transactions_v3_clean';
const LOCK_STORAGE_KEY = 'admin_operations_locks_v3_clean';

class OperationsEngine {
  private transactions: OperationTransaction[] = [];
  private locks: OperationalDailyLock[] = [];
  private isInitialized = false;

  private async syncFromSupabase(targetDate?: string) {
    try {
      const supabase = createClient();
      if (!supabase || !('from' in supabase)) return;

      let salesQuery = supabase.from('sales').select('*');
      let expensesQuery = supabase.from('expenses').select('*');

      if (targetDate) {
        const startDate = `${targetDate}T00:00:00.000Z`;
        const endDate = `${targetDate}T23:59:59.999Z`;
        salesQuery = salesQuery.gte('created_at', startDate).lte('created_at', endDate);
        expensesQuery = expensesQuery.gte('created_at', startDate).lte('created_at', endDate);
      } else {
        salesQuery = salesQuery.order('created_at', { ascending: false }).limit(1000);
        expensesQuery = expensesQuery.order('created_at', { ascending: false }).limit(1000);
      }

      const { data: sales } = await salesQuery;
      const { data: expenses } = await expensesQuery;

      const syncedTx: OperationTransaction[] = [];

      if (sales && sales.length > 0) {
        for (const s of sales) {
          const dateStr = s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          const timeStr = s.created_at ? s.created_at.split('T')[1].split('.')[0] : '12:00:00';
          const centreId = getCentreIdFromUuid(s.centre_id);
          const centreName = getCentreName(s.centre_id);
          const pmLower = (s.payment_method || '').toLowerCase();
          let method: SimplePaymentMethod = 'upi';
          if (pmLower.includes('membership')) method = 'membership';
          else if (pmLower.includes('gift')) method = 'gift_card';
          else if (pmLower.includes('upi 2') || pmLower.includes('upi2')) method = 'upi2';
          else if (pmLower.includes('upi 1') || pmLower.includes('upi1')) method = 'upi1';
          else if (pmLower.includes('cash')) method = 'cash';
          else if (pmLower.includes('card')) method = 'card';

          const sNameLower = (s.service_name || '').toLowerCase();
          let opType: OperationType = 'booking';
          if (sNameLower.includes('membership')) opType = 'membership';
          else if (sNameLower.includes('gift') || sNameLower.includes('voucher')) opType = 'gift_card';

          syncedTx.push({
            id: s.transaction_ref || s.id,
            type: opType,
            date: dateStr,
            time: timeStr,
            centreId: centreId,
            centreName: centreName,
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
          const centreId = getCentreIdFromUuid(e.centre_id);
          const centreName = getCentreName(e.centre_id);
          const pmLower = (e.payment_method || '').toLowerCase();
          let method: SimplePaymentMethod = 'cash';
          if (pmLower.includes('upi 2') || pmLower.includes('upi2')) method = 'upi2';
          else if (pmLower.includes('upi 1') || pmLower.includes('upi1') || pmLower.includes('upi')) method = 'upi1';
          else if (pmLower.includes('card')) method = 'card';

          syncedTx.push({
            id: e.id,
            type: 'expense',
            date: dateStr,
            time: timeStr,
            centreId: centreId,
            centreName: centreName,
            amount: Number(e.amount),
            paymentMethod: method,
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
      this.isInitialized = true;
      return;
    }
    try {
      // Purge legacy dirty caches
      localStorage.removeItem('admin_operations_transactions_v1');
      localStorage.removeItem('admin_operations_transactions_v2');
      localStorage.removeItem('admin_operations_locks_v1');

      const storedTx = localStorage.getItem(TX_STORAGE_KEY);
      const parsed: OperationTransaction[] = storedTx ? JSON.parse(storedTx) : [];

      // Self-healing check:
      // 1. Legacy location names (Gomti Nagar, Hazratganj)
      // 2. Invalid centre IDs
      const isDirty = parsed.some((t) =>
        !['loc_pallasio', 'loc_holidayinn', 'loc_lulumall'].includes(t.centreId) ||
        (t.centreName && (t.centreName.includes('Gomti Nagar') || t.centreName.includes('Hazratganj')))
      );

      if (isDirty || parsed.length === 0) {
        this.transactions = [];
        localStorage.removeItem(TX_STORAGE_KEY);
        console.info('[OperationsEngine] Seeding 1 month of full test data across all 3 spa outlets...');
        this.seedMonthTestData();
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

  // Generate 1 Full Month of Comprehensive Testing Data for All 3 Outlets (July 2026)
  seedMonthTestData(): { transactionsCount: number; locksCount: number } {
    const testTx: OperationTransaction[] = [];
    const testLocks: OperationalDailyLock[] = [];

    const customers = [
      'Ananya Sharma', 'Rahul Verma', 'Priya Singh', 'Vikram Malhotra', 'Sneha Gupta',
      'Rohan Mehta', 'Kavita Joshi', 'Amit Patel', 'Neha Kapoor', 'Siddharth Rao',
      'Pooja Agarwal', 'Aditya Roy', 'Divya Nair', 'Karan Bhatia', 'Ritu Saxena',
      'Manish Kumar', 'Shruti Das', 'Rajesh Pandey', 'Swati Deshmukh', 'Tarun Mittal',
    ];

    const services = [
      { name: 'Royal Moroccan Hammam', price: 6500 },
      { name: 'Deep Tissue Muscle Relief Massage (90 min)', price: 4500 },
      { name: 'Aromatherapy Relaxation Massage (60 min)', price: 3800 },
      { name: 'Swedish Body Massage (60 min)', price: 3500 },
      { name: 'Moroccan Rose Hydrating Facial', price: 5200 },
      { name: 'Couple Luxury Spa Package (120 min)', price: 12000 },
      { name: 'Head, Neck & Shoulder Therapy (45 min)', price: 2800 },
      { name: 'Foot Reflexology Spa (60 min)', price: 2500 },
    ];

    const paymentMethods: SimplePaymentMethod[] = ['cash', 'card', 'upi1', 'upi2', 'membership', 'gift_card'];

    const expenseCategories = [
      { category: 'Laundry & Linen', remarks: 'Towel & Bathrobe Dry Cleaning Services', amount: 1500 },
      { category: 'Supplies', remarks: 'Moroccan Argan Oil & Essential Herbal Oils', amount: 4200 },
      { category: 'Refreshments', remarks: 'Organic Mint Tea & Beverage Refreshments', amount: 850 },
      { category: 'Utilities', remarks: 'Outlet Electricity & Air Conditioning Maintenance', amount: 3200 },
      { category: 'Sanitization', remarks: 'Spa Hygiene, Steam Room & Towel Sanitization', amount: 1800 },
      { category: 'Staff Welfare', remarks: 'Therapist Daily Meals & Refreshments', amount: 1200 },
    ];

    const centres = [
      { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio' },
      { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall' },
      { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn' },
    ];

    let txCounter = 1000;

    // Loop through 31 days of July 2026
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-07-${String(day).padStart(2, '0')}`;
      const dayCashByCentre: Record<string, number> = { loc_pallasio: 0, loc_lulumall: 0, loc_holidayinn: 0 };
      const dayExpensesByCentre: Record<string, number> = { loc_pallasio: 0, loc_lulumall: 0, loc_holidayinn: 0 };

      for (const centre of centres) {
        // 1. Generate 3 to 7 bookings per centre per day
        const numBookings = ((day + centre.id.length) % 4) + 3;
        for (let i = 0; i < numBookings; i++) {
          txCounter++;
          const customer = customers[(day + i + txCounter) % customers.length];
          const service = services[(day + i) % services.length];
          const hour = 10 + ((i * 2) % 10);
          const minute = (i * 15) % 60;
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

          const pm = paymentMethods[(day + i) % paymentMethods.length];

          testTx.push({
            id: `op_jul_${day}_${txCounter}`,
            type: 'booking',
            date: dateStr,
            time: timeStr,
            centreId: centre.id,
            centreName: centre.name,
            amount: service.price,
            paymentMethod: pm,
            customerName: customer,
            refCode: `BK-202607${String(day).padStart(2, '0')}-${txCounter}`,
            remarks: service.name,
            user: 'reception@moroccanspa.in',
            createdAt: `${dateStr}T${timeStr}.000Z`,
          });

          if (pm === 'cash') {
            dayCashByCentre[centre.id] += service.price;
          }
        }

        // 2. Generate Membership sales occasionally
        if (day % 3 === 0) {
          txCounter++;
          const customer = customers[(day + 5) % customers.length];
          const timeStr = '14:30:00';
          const memAmount = day % 6 === 0 ? 50000 : 25000;
          const pm: SimplePaymentMethod = day % 2 === 0 ? 'upi1' : 'card';

          testTx.push({
            id: `op_mem_${day}_${txCounter}`,
            type: 'membership',
            date: dateStr,
            time: timeStr,
            centreId: centre.id,
            centreName: centre.name,
            amount: memAmount,
            paymentMethod: pm,
            customerName: customer,
            refCode: `MEM-202607-${txCounter}`,
            remarks: memAmount === 50000 ? 'Gold VIP Membership Package' : 'Silver Spa Pass Membership',
            user: 'reception@moroccanspa.in',
            createdAt: `${dateStr}T${timeStr}.000Z`,
          });
        }

        // 3. Generate Gift Card sales occasionally
        if (day % 4 === 0) {
          txCounter++;
          const customer = customers[(day + 2) % customers.length];
          const timeStr = '16:15:00';
          const gcAmount = 5000;
          const pm: SimplePaymentMethod = 'upi2';

          testTx.push({
            id: `op_gc_${day}_${txCounter}`,
            type: 'gift_card',
            date: dateStr,
            time: timeStr,
            centreId: centre.id,
            centreName: centre.name,
            amount: gcAmount,
            paymentMethod: pm,
            customerName: customer,
            refCode: `GC-202607-${txCounter}`,
            remarks: 'Moroccan Spa Luxury Voucher',
            user: 'reception@moroccanspa.in',
            createdAt: `${dateStr}T${timeStr}.000Z`,
          });
        }

        // 4. Generate expenses
        const exp = expenseCategories[(day + centre.id.length) % expenseCategories.length];
        const timeStr = '18:00:00';

        testTx.push({
          id: `op_exp_${day}_${txCounter}`,
          type: 'expense',
          date: dateStr,
          time: timeStr,
          centreId: centre.id,
          centreName: centre.name,
          amount: exp.amount,
          paymentMethod: 'cash',
          category: exp.category,
          remarks: exp.remarks,
          user: 'Admin',
          createdAt: `${dateStr}T${timeStr}.000Z`,
        });

        dayExpensesByCentre[centre.id] += exp.amount;

        // 5. Lock past days (July 1 to July 26)
        if (day <= 26) {
          const expectedCash = Math.max(12000, dayCashByCentre[centre.id] - dayExpensesByCentre[centre.id]);
          testLocks.push({
            id: `lock_${centre.id}_${dateStr}`,
            centreId: centre.id,
            date: dateStr,
            actualCashCounted: expectedCash,
            mismatchReason: undefined,
            remarks: 'End of day accounts reconciled & verified by Centre Manager',
            closedBy: 'Centre Manager',
            closedTime: '21:30:00',
            isLocked: true,
          });
        }
      }
    }

    this.transactions = testTx;
    this.locks = testLocks;
    this.saveTx();
    this.saveLocks();

    return { transactionsCount: testTx.length, locksCount: testLocks.length };
  }

  async fetchTransactions(targetDate?: string) {
    this.init();
    await this.syncFromSupabase(targetDate);
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
    if (pmLower.includes('membership')) method = 'membership';
    else if (pmLower.includes('gift')) method = 'gift_card';
    else if (pmLower.includes('upi 2') || pmLower.includes('upi2')) method = 'upi2';
    else if (pmLower.includes('upi 1') || pmLower.includes('upi1')) method = 'upi1';
    else if (pmLower.includes('cash')) method = 'cash';
    else if (pmLower.includes('card')) method = 'card';

    const dateStr = params.date || new Date().toISOString().split('T')[0];
    const timeStr = params.time || new Date().toTimeString().split(' ')[0];

    const resolvedCentreId = getCentreIdFromUuid(params.centreId);
    const resolvedCentreName = getCentreName(params.centreId);

    const newTx: OperationTransaction = {
      id: `op_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: params.type,
      date: dateStr,
      time: timeStr,
      centreId: resolvedCentreId,
      centreName: resolvedCentreName,
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
        const centreUuid = getCentreUuid(params.centreId);

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
            paid_to: params.customerName || params.user || 'Vendor',
            recorded_by: params.user || 'Admin',
            payment_method: params.paymentMethod || 'Cash',
          };
          console.log('Attempting Supabase Insert with Payload:', expensePayload);
          const { data, error: expErr } = await supabase.from('expenses').insert([expensePayload]).select();
          if (expErr) {
            console.error('Supabase Insert Failed:', expErr);
            throw new Error(`Database error saving expense: ${expErr.message}`);
          }
          if (data && data[0]?.id) {
            newTx.id = data[0].id;
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

  // ATOMIC REFUND & REVERSAL (Immutability Guarantee: Original transaction is preserved, reversal entry is recorded)
  async refundTransaction(originalTxId: string, reason: string, userEmail: string = 'admin@moroccanspa.in'): Promise<OperationTransaction> {
    this.init();
    const orig = this.transactions.find((t) => t.id === originalTxId || t.refCode === originalTxId);
    if (!orig) {
      throw new Error(`Original transaction "${originalTxId}" not found for refund reversal.`);
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const reversalTx = await this.addTransaction({
      type: 'refund',
      centreId: orig.centreId,
      centreName: orig.centreName,
      amount: orig.amount,
      paymentMethod: orig.paymentMethod,
      category: 'Refund & Reversal',
      remarks: `Reversal Refund for ${orig.refCode || orig.id}: ${reason}`,
      customerName: orig.customerName,
      user: userEmail,
      refCode: `REV-${orig.refCode || orig.id}`,
      date: dateStr,
    });

    return reversalTx;
  }

  // Get Lock Record
  getLock(centreId: string, date: string): OperationalDailyLock | undefined {
    this.init();
    return this.locks.find((l) => (centreId === 'all' || l.centreId === centreId) && l.date === date);
  }

  // Opening Cash = Cumulative Cash Running Balance prior to target date (Carried forward from yesterday's locked closing or prior transactions SSOT)
  getOpeningCash(centreId: string, date: string): number {
    this.init();
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;
    const targetUuid = cid === 'all' ? 'all' : getCentreUuid(cid);

    // 1. Check if yesterday was locked with an actual cash count
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    if (targetUuid === 'all') {
      const yesterdayLocks = this.locks.filter((l) => l.date === yesterdayStr && l.isLocked);
      if (yesterdayLocks.length > 0) {
        return yesterdayLocks.reduce((sum, l) => sum + l.actualCashCounted, 0);
      }
    } else {
      const yesterdayLock = this.locks.find(
        (l) => getCentreUuid(l.centreId) === targetUuid && l.date === yesterdayStr && l.isLocked
      );
      if (yesterdayLock) {
        return yesterdayLock.actualCashCounted;
      }
    }

    // 2. Fallback: Calculate cumulative running cash balance from ALL transactions strictly prior to target date
    let cumulativeCash = 0;
    for (const t of this.transactions) {
      if (t.date >= date) continue; // Only process transactions prior to target date
      const tUuid = getCentreUuid(t.centreId);
      if (targetUuid !== 'all' && tUuid !== targetUuid) continue;

      const pmLower = (t.paymentMethod || '').toLowerCase();
      if (pmLower === 'cash' || pmLower.includes('cash')) {
        const isCashIn = ['booking', 'membership', 'gift_card', 'package', 'customer_advance', 'cash_in'].includes(t.type);
        const isCashOut = ['expense', 'salary', 'advance', 'handover', 'bank_deposit', 'refund', 'cash_out'].includes(t.type);

        if (isCashIn) cumulativeCash += t.amount;
        else if (isCashOut) cumulativeCash -= t.amount;
      }
    }

    return cumulativeCash;
  }

  // Filtered Transactions for Drill-Down Modal
  getFilteredTransactions(centreId?: string | null, category?: string, dateStr?: string): OperationTransaction[] {
    this.init();
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : getCentreIdFromUuid(centreId);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    return this.transactions.filter((t) => {
      const matchCentre = cid === 'all' || getCentreIdFromUuid(t.centreId) === cid;
      const matchDate = t.date === targetDate;
      if (!matchCentre || !matchDate) return false;

      if (category === 'revenue') {
        // REVENUE RULE: Revenue is recognized ONLY ONCE when New Money enters the business.
        // Redemptions via Membership or Gift Card consume stored balance and are NOT new sales.
        if (['membership', 'gift_card'].includes(t.type)) return true;
        if (['booking', 'package'].includes(t.type)) {
          const pmLower = (t.paymentMethod as string || '').toLowerCase();
          return !pmLower.includes('membership') && !pmLower.includes('gift');
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
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : getCentreIdFromUuid(centreId);

    const todayTx = this.transactions.filter(
      (t) => (cid === 'all' || getCentreIdFromUuid(t.centreId) === cid) && t.date === todayStr
    );

    // REVENUE RULE: Count ONLY New Money (Cash/Card/UPI Bookings + New Membership Sales + New Gift Card Sales)
    const totalRevenue = todayTx
      .filter((t) => {
        if (['membership', 'gift_card'].includes(t.type)) return true;
        if (['booking', 'package'].includes(t.type)) {
          const pmLower = (t.paymentMethod as string || '').toLowerCase();
          return !pmLower.includes('membership') && !pmLower.includes('gift');
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
  getDailyRegister(centreId: string, date: string): DailyRegisterResult {
    this.init();
    const cid = !centreId || centreId === 'all' || centreId === 'Consolidated' ? 'all' : centreId;
    const targetUuid = cid === 'all' ? 'all' : getCentreUuid(cid);
    const openingCash = this.getOpeningCash(cid, date);

    const dayTx = this.transactions.filter((t) => {
      if (t.date !== date) return false;
      if (cid === 'all') return true;
      const tUuid = getCentreUuid(t.centreId);
      return t.centreId === cid || tUuid === targetUuid;
    });

    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;
    let upi1Sales = 0;
    let upi2Sales = 0;
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
        } else if (pm.includes('upi 2')) {
          upi2Sales += t.amount;
          upiSales += t.amount;
        } else {
          upi1Sales += t.amount;
          upiSales += t.amount;
        }
      } else if (t.type === 'membership') {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (pm.includes('cash')) membershipCash += t.amount;
        else if (pm.includes('card')) membershipCard += t.amount;
        else {
          membershipUpi += t.amount;
          if (pm.includes('upi 2')) upi2Sales += t.amount;
          else upi1Sales += t.amount;
        }
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

    const totalCashInToday = cashSales + membershipCash + giftCardSales + packageSales + customerAdvances + cashInOther;
    const totalCashOutToday = expenses + salaryPayments + staffAdvances + cashHandover + bankDeposits + refunds + cashOutOther;
    const todayNetCashMovement = totalCashInToday - totalCashOutToday;

    // EXPECTED CLOSING CASH SSOT = Opening Cash (carried forward) + Today's Net Cash Movement
    const expectedClosingCash = openingCash + todayNetCashMovement;

    let isLocked = false;
    let closedBy = '';
    let closedTime = '';
    let mismatchReason = '';
    let remarks = '';
    let actualCashCounted = expectedClosingCash;

    if (cid === 'all') {
      const activeLocks = this.locks.filter((l) => l.date === date && l.isLocked);
      isLocked = activeLocks.length >= 3;
      if (activeLocks.length > 0) {
        actualCashCounted = activeLocks.reduce((s, l) => s + l.actualCashCounted, 0);
        closedBy = activeLocks.map((l) => l.closedBy).filter(Boolean).join('; ') || 'Super Admin';
        closedTime = activeLocks.map((l) => l.closedTime).filter(Boolean).join('; ');
        mismatchReason = activeLocks.map((l) => l.mismatchReason).filter(Boolean).join('; ');
        remarks = activeLocks.map((l) => l.remarks).filter(Boolean).join('; ');
      }
    } else {
      const lock = this.getLock(cid, date);
      isLocked = !!(lock && lock.isLocked);
      actualCashCounted = lock ? lock.actualCashCounted : expectedClosingCash;
      closedBy = lock?.closedBy || '';
      closedTime = lock?.closedTime || '';
      mismatchReason = lock?.mismatchReason || '';
      remarks = lock?.remarks || '';
    }

    const difference = actualCashCounted - expectedClosingCash;

    return {
      date,
      centreId: cid,
      openingCash,
      financialRevenue,
      cashSales,
      cardSales,
      upiSales,
      upi1Sales,
      upi2Sales,
      membershipCash,
      membershipCard,
      membershipUpi,
      giftCardSales,
      packageSales,
      customerAdvances,
      totalCashInToday,
      totalCashOutToday,
      todayNetCashMovement,
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
      cashInOther,
      cashOutOther,
      expectedClosingCash,
      actualCashCounted,
      difference,
      isLocked,
      closedBy,
      closedTime,
      mismatchReason,
      remarks,
    };
  }

  // Top Bar Centre Overview Matrix
  getCentresOverview(date: string) {
    this.init();
    const list = [
      { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall', shortName: 'Lulu Mall' },
      { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio', shortName: 'Phoenix Palassio' },
      { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn', shortName: 'Holiday Inn' },
    ];

    return list.map((c) => {
      const reg = this.getDailyRegister(c.id, date);
      const lock = this.getLock(c.id, date);
      let status: 'Closed' | 'Open' | 'Review' = 'Open';
      if (lock && lock.isLocked) {
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
        isLocked: !!(lock && lock.isLocked),
      };
    });
  }

  // Multi-Centre Side-by-Side Monthly Matrix
  getMultiCentreMonthlySummary(yearMonthStr: string) {
    this.init();
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows = [];

    const luluId = 'loc_lulumall';
    const palassioId = 'loc_pallasio';
    const holidayId = 'loc_holidayinn';

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;

      const luluReg = this.getDailyRegister(luluId, dateStr);
      const palassioReg = this.getDailyRegister(palassioId, dateStr);
      const holidayReg = this.getDailyRegister(holidayId, dateStr);

      const luluSales = luluReg.financialRevenue;
      const palassioSales = palassioReg.financialRevenue;
      const holidaySales = holidayReg.financialRevenue;
      const orgTotal = luluSales + palassioSales + holidaySales;

      rows.push({
        date: dateStr,
        day,
        luluSales,
        palassioSales,
        holidaySales,
        orgTotal,
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
    const targetIds = params.centreId === 'all' ? ['loc_lulumall', 'loc_pallasio', 'loc_holidayinn'] : [params.centreId];

    let lastLock: OperationalDailyLock | null = null;
    for (const cid of targetIds) {
      const lockRecord: OperationalDailyLock = {
        id: `lock_${cid}_${params.date}`,
        centreId: cid,
        date: params.date,
        actualCashCounted: params.actualCashCounted,
        mismatchReason: params.mismatchReason,
        remarks: params.remarks,
        closedBy: params.closedBy,
        closedTime: new Date().toISOString(),
        isLocked: true,
      };

      const existingIndex = this.locks.findIndex((l) => l.centreId === cid && l.date === params.date);
      if (existingIndex >= 0) {
        this.locks[existingIndex] = lockRecord;
      } else {
        this.locks.push(lockRecord);
      }
      lastLock = lockRecord;
    }

    this.saveLocks();
    return lastLock!;
  }

  // Unlock Day (Super Admin Only)
  async unlockDay(params: { centreId: string; date: string; unlockedBy: string; reason: string }): Promise<void> {
    this.init();
    const targetIds = params.centreId === 'all' ? ['loc_lulumall', 'loc_pallasio', 'loc_holidayinn'] : [params.centreId];

    for (const cid of targetIds) {
      const index = this.locks.findIndex((l) => l.centreId === cid && l.date === params.date);
      if (index >= 0) {
        this.locks[index].isLocked = false;
        this.locks[index].remarks = `Reopened on ${new Date().toISOString()} by ${params.unlockedBy}. Reason: ${params.reason}`;
      }
    }

    this.saveLocks();
  }

  getTransactions(centreId?: string | null): OperationTransaction[] {
    this.init();
    if (!centreId || centreId === 'all') return [...this.transactions];
    const targetCid = getCentreIdFromUuid(centreId);
    return this.transactions.filter((t) => getCentreIdFromUuid(t.centreId) === targetCid);
  }
}

export const operationsEngine = new OperationsEngine();
