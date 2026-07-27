// ============================================================
// MEMBERSHIP SERVICE — Refactored to use Business Day Engine
// ============================================================
// Write path: Sales and redemptions flow through pipeline.
// Read path: Memberships read from Supabase memberships table.
// Plans are managed separately (still lightweight, Supabase optional).
// No localStorage. No OperationsEngine.
// ============================================================

import { transactionPipeline } from '@/features/business-day-engine';
import { resolveCentreId, resolvePaymentMethod } from '@/features/business-day-engine/utils/centre-resolver';
import { createClient } from '@/lib/supabase/client';

export interface MembershipPlan {
  id: string;
  tierName: string;
  discountPercentage: number;
  price: number;
  validityDays: number;
  benefits: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface MembershipLedgerEntry {
  id: string;
  date: string;
  type: 'CREDIT_PURCHASE' | 'DEBIT_REDEMPTION';
  bookingRef?: string;
  description: string;
  amount: number;
  remainingBalance: number;
  centreName?: string;
}

export interface CustomerMembership {
  id: string;
  membershipNumber: string;
  customerName: string;
  customerPhone: string;
  membershipName: string;
  purchaseDate: string;
  originalValue: number;
  remainingBalance: number;
  expiryDate?: string;
  status: 'Active' | 'Expired' | 'Exhausted';
  centreId: string;
  centreName: string;
  ledger: MembershipLedgerEntry[];
}

// Plans are lightweight config — stored in Supabase or managed in-memory
const STORAGE_PLANS_KEY = 'admin_membership_plans_v1';

class MembershipService {
  private supabase = createClient();
  private plans: MembershipPlan[] = [];
  private plansInitialized = false;

  private initPlans() {
    if (this.plansInitialized) return;
    if (typeof window === 'undefined') {
      this.plans = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_PLANS_KEY);
      this.plans = stored ? JSON.parse(stored) : [];
    } catch {
      this.plans = [];
    }
    this.plansInitialized = true;
  }

  private savePlans() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(this.plans));
    }
  }

  // --- Membership Plans Management (config, not financial) ---
  async getMemberships(): Promise<MembershipPlan[]> {
    this.initPlans();
    return [...this.plans];
  }

  async addMembership(data: Omit<MembershipPlan, 'id' | 'createdAt'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<MembershipPlan> {
    this.initPlans();
    const newPlan: MembershipPlan = {
      ...data,
      id: `mem_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.plans.unshift(newPlan);
    this.savePlans();
    return newPlan;
  }

  async updateMembership(id: string, updates: Partial<Omit<MembershipPlan, 'id'>>): Promise<MembershipPlan> {
    this.initPlans();
    const item = this.plans.find((m) => m.id === id);
    if (!item) throw new Error('Membership Plan not found.');
    Object.assign(item, updates);
    this.savePlans();
    return { ...item };
  }

  async deleteMembership(id: string): Promise<void> {
    this.initPlans();
    const index = this.plans.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.plans.splice(index, 1);
      this.savePlans();
    }
  }

  // --- Customer Membership Sales & Lifecycle (Supabase-backed) ---

  async getCustomerMemberships(): Promise<CustomerMembership[]> {
    const { data, error } = await this.supabase
      .from('memberships')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MembershipService] Failed to fetch memberships:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => this.mapRowToCustomerMembership(row));
  }

  async getCustomerActiveMemberships(phone: string): Promise<CustomerMembership[]> {
    const cleanPhone = phone.trim();
    const { data, error } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('customer_phone', cleanPhone)
      .eq('status', 'Active')
      .gt('remaining_balance', 0);

    if (error) {
      console.error('[MembershipService] Failed to fetch active memberships:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => this.mapRowToCustomerMembership(row));
  }

  async sellCustomerMembership(data: {
    customerName: string;
    customerPhone: string;
    membershipName: string;
    originalValue: number;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    expiryDays?: number;
  }): Promise<CustomerMembership> {
    const dateStr = new Date().toISOString().split('T')[0];
    const seq = Math.floor(100000 + Math.random() * 900000);
    const membershipNumber = `MEM-2026-${seq}`;
    const centreUuid = resolveCentreId(data.centreId);

    let expiryDate: string | undefined = undefined;
    if (data.expiryDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + data.expiryDays);
      expiryDate = exp.toISOString().split('T')[0];
    }

    // Get current user ID
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';

    // Record via pipeline — this inserts into memberships table AND creates business event
    const { membership } = await transactionPipeline.recordMembershipSale({
      centreId: centreUuid,
      date: dateStr,
      membership: {
        membership_number: membershipNumber,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        plan_name: data.membershipName,
        original_value: data.originalValue,
        remaining_balance: data.originalValue,
        payment_method: resolvePaymentMethod(data.paymentMethod),
        selling_centre_id: centreUuid,
        expiry_date: expiryDate,
        created_by: userId,
      },
      createdBy: userId,
    });

    const memRow = membership as Record<string, unknown>;

    return this.mapRowToCustomerMembership(memRow);
  }

  async deductMembershipBalance(
    membershipId: string,
    amount: number,
    bookingRef: string,
    centreName: string
  ): Promise<CustomerMembership> {
    // Resolve the actual Supabase ID (may be a membershipNumber)
    let resolvedId = membershipId;
    if (!membershipId.includes('-') || membershipId.startsWith('MEM-')) {
      // Lookup by membership_number
      const { data: found } = await this.supabase
        .from('memberships')
        .select('id, centre_id')
        .eq('membership_number', membershipId)
        .single();
      if (found) resolvedId = found.id as string;
    }

    // Get centre from membership
    const { data: mem } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('id', resolvedId)
      .single();

    if (!mem) throw new Error('Customer Membership not found.');
    if (mem.status !== 'Active') throw new Error(`Membership is ${(mem.status as string).toLowerCase()}.`);
    if ((mem.remaining_balance as number) < amount) {
      throw new Error(`Insufficient balance! Active balance: ₹${(mem.remaining_balance as number).toLocaleString('en-IN')}, Service cost: ₹${amount.toLocaleString('en-IN')}`);
    }

    // Get current user
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';
    const dateStr = new Date().toISOString().split('T')[0];

    // Record redemption via pipeline
    await transactionPipeline.recordMembershipRedemption({
      centreId: mem.selling_centre_id as string,
      date: dateStr,
      membershipId: resolvedId,
      amount,
      customerName: mem.customer_name as string,
      serviceName: bookingRef,
      createdBy: userId,
    });

    // Fetch updated membership
    const { data: updated } = await this.supabase
      .from('memberships')
      .select('*')
      .eq('id', resolvedId)
      .single();

    return this.mapRowToCustomerMembership(updated || mem);
  }

  async getMembershipReports() {
    const memberships = await this.getCustomerMemberships();
    const totalSalesValue = memberships.reduce((sum, m) => sum + m.originalValue, 0);
    const totalRemainingLiability = memberships.reduce((sum, m) => sum + m.remainingBalance, 0);
    const activeCount = memberships.filter((m) => m.status === 'Active').length;
    const exhaustedCount = memberships.filter((m) => m.status === 'Exhausted').length;

    return {
      totalSold: memberships.length,
      totalSalesValue,
      totalRemainingLiability,
      activeCount,
      exhaustedCount,
    };
  }

  private mapRowToCustomerMembership(row: Record<string, unknown>): CustomerMembership {
    return {
      id: row.id as string,
      membershipNumber: (row.membership_number || '') as string,
      customerName: (row.customer_name || '') as string,
      customerPhone: (row.customer_phone || '') as string,
      membershipName: (row.plan_name || '') as string,
      purchaseDate: (row.created_at || '') as string,
      originalValue: (row.original_value || 0) as number,
      remainingBalance: (row.remaining_balance || 0) as number,
      expiryDate: row.expiry_date as string | undefined,
      status: (row.status || 'Active') as 'Active' | 'Expired' | 'Exhausted',
      centreId: (row.selling_centre_id || '') as string,
      centreName: '',
      ledger: [], // Ledger is now in business_events — use getEventsForDate() if needed
    };
  }
}

export const membershipService = new MembershipService();
