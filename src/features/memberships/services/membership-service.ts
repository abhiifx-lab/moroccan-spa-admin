import { operationsEngine } from '@/features/operations/services/operations-engine';

export interface MembershipPlan {
  id: string;
  tierName: string; // e.g. Silver, Gold, Royal Diamond
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
  membershipNumber: string; // e.g. MEM-2026-000183
  customerName: string;
  customerPhone: string;
  membershipName: string; // e.g. Gold Membership
  purchaseDate: string;
  originalValue: number;
  remainingBalance: number;
  expiryDate?: string;
  status: 'Active' | 'Expired' | 'Exhausted';
  centreId: string;
  centreName: string;
  ledger: MembershipLedgerEntry[];
}

const STORAGE_PLANS_KEY = 'admin_memberships_v5_clean';
const STORAGE_CUSTOMER_MEMBERSHIPS_KEY = 'admin_customer_memberships_v1';

class MembershipService {
  private plans: MembershipPlan[] = [];
  private customerMemberships: CustomerMembership[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.plans = [];
      this.customerMemberships = [];
      return;
    }
    try {
      const storedPlans = localStorage.getItem(STORAGE_PLANS_KEY);
      this.plans = storedPlans ? JSON.parse(storedPlans) : [];
      const storedCust = localStorage.getItem(STORAGE_CUSTOMER_MEMBERSHIPS_KEY);
      this.customerMemberships = storedCust ? JSON.parse(storedCust) : [];
    } catch {
      this.plans = [];
      this.customerMemberships = [];
    }
    this.isInitialized = true;
  }

  private savePlans() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(this.plans));
    }
  }

  private saveCustomerMemberships() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CUSTOMER_MEMBERSHIPS_KEY, JSON.stringify(this.customerMemberships));
    }
  }

  // --- Membership Plans Management ---
  async getMemberships(): Promise<MembershipPlan[]> {
    this.init();
    return [...this.plans];
  }

  async addMembership(data: Omit<MembershipPlan, 'id' | 'createdAt'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<MembershipPlan> {
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const newPlan: MembershipPlan = {
      ...data,
      id: `mem_${Date.now()}`,
      createdAt: dateStr,
    };
    this.plans.unshift(newPlan);
    this.savePlans();
    return newPlan;
  }

  async updateMembership(id: string, updates: Partial<Omit<MembershipPlan, 'id'>>): Promise<MembershipPlan> {
    this.init();
    const item = this.plans.find((m) => m.id === id);
    if (!item) throw new Error('Membership Plan not found.');
    Object.assign(item, updates);
    this.savePlans();
    return { ...item };
  }

  async deleteMembership(id: string): Promise<void> {
    this.init();
    const index = this.plans.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.plans.splice(index, 1);
      this.savePlans();
    }
  }

  // --- Customer Memberships Sales & Ledger ---
  async getCustomerMemberships(): Promise<CustomerMembership[]> {
    this.init();
    return [...this.customerMemberships];
  }

  async getCustomerActiveMemberships(phone: string): Promise<CustomerMembership[]> {
    this.init();
    const cleanPhone = phone.trim();
    return this.customerMemberships.filter(
      (m) => m.customerPhone.trim() === cleanPhone && m.status === 'Active' && m.remainingBalance > 0
    );
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
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const seq = Math.floor(100000 + Math.random() * 900000);
    const membershipNumber = `MEM-2026-${seq}`;

    let expiryDate: string | undefined = undefined;
    if (data.expiryDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + data.expiryDays);
      expiryDate = exp.toISOString().split('T')[0];
    }

    const initialLedger: MembershipLedgerEntry = {
      id: `led_${Date.now()}`,
      date: dateStr,
      type: 'CREDIT_PURCHASE',
      description: `Membership Purchased: ${data.membershipName}`,
      amount: data.originalValue,
      remainingBalance: data.originalValue,
      centreName: data.centreName,
    };

    const newCustMem: CustomerMembership = {
      id: `cmem_${Date.now()}`,
      membershipNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      membershipName: data.membershipName,
      purchaseDate: dateStr,
      originalValue: data.originalValue,
      remainingBalance: data.originalValue,
      expiryDate,
      status: 'Active',
      centreId: data.centreId,
      centreName: data.centreName,
      ledger: [initialLedger],
    };

    this.customerMemberships.unshift(newCustMem);
    this.saveCustomerMemberships();

    // Record Operational Transaction (Sales Revenue)
    try {
      await operationsEngine.addTransaction({
        type: 'membership',
        centreId: data.centreId,
        centreName: data.centreName,
        amount: data.originalValue,
        paymentMethod: data.paymentMethod,
        refCode: membershipNumber,
        customerName: data.customerName,
        remarks: `Membership Sale: ${data.membershipName} (${membershipNumber}) for ${data.customerName}`,
        date: dateStr,
      });
    } catch (err) {
      console.warn('Membership sales record warning:', err);
    }

    return newCustMem;
  }

  async deductMembershipBalance(
    membershipId: string,
    amount: number,
    bookingRef: string,
    centreName: string
  ): Promise<CustomerMembership> {
    this.init();
    const mem = this.customerMemberships.find((m) => m.id === membershipId || m.membershipNumber === membershipId);
    if (!mem) throw new Error('Customer Membership not found.');

    if (mem.status !== 'Active') throw new Error(`Membership is ${mem.status.toLowerCase()}.`);
    if (mem.remainingBalance < amount) {
      throw new Error(`Insufficient balance! Active balance: ₹${mem.remainingBalance.toLocaleString('en-IN')}, Service cost: ₹${amount.toLocaleString('en-IN')}`);
    }

    const newBalance = mem.remainingBalance - amount;
    mem.remainingBalance = newBalance;

    if (newBalance <= 0) {
      mem.status = 'Exhausted';
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const ledgerEntry: MembershipLedgerEntry = {
      id: `led_${Date.now()}`,
      date: dateStr,
      type: 'DEBIT_REDEMPTION',
      bookingRef,
      description: `Service Booking Payment (${bookingRef})`,
      amount: -amount,
      remainingBalance: newBalance,
      centreName,
    };

    mem.ledger.unshift(ledgerEntry);
    this.saveCustomerMemberships();
    return { ...mem };
  }

  async getMembershipReports() {
    this.init();
    const totalSalesValue = this.customerMemberships.reduce((sum, m) => sum + m.originalValue, 0);
    const totalRemainingLiability = this.customerMemberships.reduce((sum, m) => sum + m.remainingBalance, 0);
    const activeCount = this.customerMemberships.filter((m) => m.status === 'Active').length;
    const exhaustedCount = this.customerMemberships.filter((m) => m.status === 'Exhausted').length;

    return {
      totalSold: this.customerMemberships.length,
      totalSalesValue,
      totalRemainingLiability,
      activeCount,
      exhaustedCount,
    };
  }
}

export const membershipService = new MembershipService();
