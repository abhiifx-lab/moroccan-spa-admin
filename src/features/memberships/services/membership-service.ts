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

const STORAGE_KEY = 'admin_memberships_v5_clean';

export const INITIAL_MEMBERSHIPS: MembershipPlan[] = [];

class MembershipService {
  private memberships: MembershipPlan[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.memberships = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.memberships = stored ? JSON.parse(stored) : [];
    } catch {
      this.memberships = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memberships));
    }
  }

  async getMemberships(): Promise<MembershipPlan[]> {
    this.init();
    return [...this.memberships];
  }

  async addMembership(data: Omit<MembershipPlan, 'id' | 'createdAt'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<MembershipPlan> {
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const newPlan: MembershipPlan = {
      ...data,
      id: `mem_${Date.now()}`,
      createdAt: dateStr,
    };
    this.memberships.unshift(newPlan);
    this.save();

    // AUTO-RECORD OPERATIONAL TRANSACTION (Single Entry)
    try {
      await operationsEngine.addTransaction({
        type: 'membership',
        centreId: data.centreId || 'loc_1',
        centreName: data.centreName || 'Moroccan Spa Gomti Nagar Flagship',
        amount: newPlan.price,
        paymentMethod: data.paymentMethod || 'Cash at Desk',
        refCode: newPlan.id,
        remarks: `Membership Sold: ${newPlan.tierName} (${newPlan.discountPercentage}% Off)`,
        date: dateStr,
      });
    } catch (err: unknown) {
      console.warn('Membership ops record warning:', err);
    }

    return newPlan;
  }

  async updateMembership(id: string, updates: Partial<Omit<MembershipPlan, 'id'>>): Promise<MembershipPlan> {
    this.init();
    const item = this.memberships.find((m) => m.id === id);
    if (!item) throw new Error('Membership Plan not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deleteMembership(id: string): Promise<void> {
    this.init();
    const index = this.memberships.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.memberships.splice(index, 1);
      this.save();
    }
  }
}

export const membershipService = new MembershipService();
