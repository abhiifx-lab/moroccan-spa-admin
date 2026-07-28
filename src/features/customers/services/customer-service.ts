import { GlobalCustomer, CustomerVisitRecord } from '../types/customer.types';

export type { GlobalCustomer, CustomerVisitRecord };
export type CustomerProfile = GlobalCustomer;

const STORAGE_KEY = 'admin_global_customers_v3_clean';

export const INITIAL_GLOBAL_CUSTOMERS: GlobalCustomer[] = [];

class CustomerService {
  private customers: GlobalCustomer[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.customers = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.customers = stored ? JSON.parse(stored) : [];
    } catch {
      this.customers = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customers));
    }
  }

  async getCustomers(): Promise<GlobalCustomer[]> {
    this.init();
    return [...this.customers];
  }

  async findByPhone(phone: string): Promise<GlobalCustomer | null> {
    this.init();
    const cleanQuery = phone.replace(/\D/g, '');
    if (cleanQuery.length < 5) return null;

    const found = this.customers.find((c) => {
      const cleanPhone = c.phone.replace(/\D/g, '');
      return cleanPhone.includes(cleanQuery) || cleanQuery.includes(cleanPhone);
    });

    return found ? { ...found } : null;
  }

  async addOrUpdateCustomer(
    name: string,
    phone: string,
    email?: string,
    amountSpent: number = 0
  ): Promise<GlobalCustomer> {
    return this.addOrUpdateGlobalCustomer({
      name,
      phone,
      email,
      centreId: 'loc_pallasio',
      centreName: 'Moroccan Spa - Phoenix Palassio',
      bookingRef: `BK-${Date.now()}`,
      serviceName: 'Spa Treatment',
      amountSpent,
    });
  }

  async addOrUpdateGlobalCustomer(data: {
    name: string;
    phone: string;
    email?: string;
    centreId: string;
    centreName: string;
    bookingRef: string;
    serviceName: string;
    amountSpent: number;
    therapistName?: string;
  }): Promise<GlobalCustomer> {
    this.init();
    const existing = await this.findByPhone(data.phone);

    const newVisit: CustomerVisitRecord = {
      id: `v_${Date.now()}`,
      bookingRef: data.bookingRef,
      centreId: data.centreId,
      centreName: data.centreName,
      serviceName: data.serviceName,
      amount: data.amountSpent,
      date: new Date().toISOString().split('T')[0],
      therapistName: data.therapistName,
    };

    if (existing) {
      const index = this.customers.findIndex((c) => c.id === existing.id);
      if (index !== -1) {
        const cust = this.customers[index];
        cust.totalBookings += 1;
        cust.totalSpent += data.amountSpent;
        cust.visits.unshift(newVisit);
        cust.updatedAt = new Date().toISOString().split('T')[0];

        if (cust.totalSpent > 50000) cust.tier = 'Royal Diamond';
        else if (cust.totalSpent > 25000) cust.tier = 'VIP Gold';
        else if (cust.totalSpent > 10000) cust.tier = 'Silver';

        if (data.name && data.name !== cust.name) cust.name = data.name;
        if (data.email && !cust.email) cust.email = data.email;

        this.save();
        return cust;
      }
    }

    const newCustomer: GlobalCustomer = {
      id: `c_${Date.now()}`,
      name: data.name || 'Valued Guest',
      phone: data.phone,
      email: data.email || '',
      totalBookings: 1,
      totalSpent: data.amountSpent,
      tier: data.amountSpent > 25000 ? 'VIP Gold' : data.amountSpent > 10000 ? 'Silver' : 'Standard',
      visits: [newVisit],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    this.customers.unshift(newCustomer);
    this.save();
    return newCustomer;
  }

  async mergeDuplicateCustomers(primaryId: string, secondaryId: string): Promise<GlobalCustomer> {
    this.init();
    const primaryIndex = this.customers.findIndex((c) => c.id === primaryId);
    const secondaryIndex = this.customers.findIndex((c) => c.id === secondaryId);

    if (primaryIndex === -1 || secondaryIndex === -1) throw new Error('Customer profiles not found for merging.');

    const primary = this.customers[primaryIndex];
    const secondary = this.customers[secondaryIndex];

    primary.totalBookings += secondary.totalBookings;
    primary.totalSpent += secondary.totalSpent;
    primary.visits = [...primary.visits, ...secondary.visits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (primary.totalSpent > 50000) primary.tier = 'Royal Diamond';
    else if (primary.totalSpent > 25000) primary.tier = 'VIP Gold';

    this.customers.splice(secondaryIndex, 1);
    this.save();
    return primary;
  }
}

export const customerService = new CustomerService();
