export interface PromoOffer {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  applicableCentres: string[]; // ['all'] or specific centre IDs
  applicableServices: string[]; // ['all'] or specific service IDs
  maxUses: number;
  perCustomerLimit: number;
  usageCount: number;
  status: 'Active' | 'Inactive';
  priority: number;
  createdBy: string;
  createdAt: string;
}

const STORAGE_KEY = 'admin_offers_v6_enterprise';

export const INITIAL_OFFERS: PromoOffer[] = [
  {
    id: 'off_welcome25',
    name: 'Welcome Luxury Spa Discount',
    code: 'WELCOME25',
    description: '25% Flat Discount for First Time Spa Guests',
    discountType: 'Percentage',
    discountValue: 25,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    applicableCentres: ['all'],
    applicableServices: ['all'],
    maxUses: 1000,
    perCustomerLimit: 1,
    usageCount: 14,
    status: 'Active',
    priority: 1,
    createdBy: 'Marketing Team',
    createdAt: '2026-01-01',
  },
  {
    id: 'off_festive500',
    name: 'Moroccan Royal Hammam Voucher',
    code: 'ROYAL500',
    description: 'Flat ₹500 Off on Royal Moroccan Hammam Rituals',
    discountType: 'Fixed',
    discountValue: 500,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    applicableCentres: ['all'],
    applicableServices: ['all'],
    maxUses: 500,
    perCustomerLimit: 2,
    usageCount: 8,
    status: 'Active',
    priority: 2,
    createdBy: 'Marketing Team',
    createdAt: '2026-01-01',
  },
];

class OfferService {
  private offers: PromoOffer[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.offers = [...INITIAL_OFFERS];
      this.isInitialized = true;
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.offers = stored ? JSON.parse(stored) : [...INITIAL_OFFERS];
    } catch {
      this.offers = [...INITIAL_OFFERS];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.offers));
    }
  }

  async getOffers(): Promise<PromoOffer[]> {
    this.init();
    return [...this.offers];
  }

  async addOffer(data: Omit<PromoOffer, 'id' | 'usageCount' | 'createdAt'>): Promise<PromoOffer> {
    this.init();
    const newOffer: PromoOffer = {
      ...data,
      id: `off_${Date.now()}`,
      usageCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.offers.unshift(newOffer);
    this.save();
    return newOffer;
  }

  async updateOffer(id: string, updates: Partial<Omit<PromoOffer, 'id'>>): Promise<PromoOffer> {
    this.init();
    const item = this.offers.find((o) => o.id === id);
    if (!item) throw new Error('Promo offer not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async toggleOfferStatus(id: string): Promise<PromoOffer> {
    this.init();
    const item = this.offers.find((o) => o.id === id);
    if (!item) throw new Error('Promo offer not found.');
    item.status = item.status === 'Active' ? 'Inactive' : 'Active';
    this.save();
    return { ...item };
  }

  async deleteOffer(id: string): Promise<void> {
    this.init();
    const index = this.offers.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.offers.splice(index, 1);
      this.save();
    }
  }

  async validateOffer(
    code: string,
    basePrice: number,
    centreId?: string,
    serviceId?: string
  ): Promise<{ isValid: boolean; discountAmount: number; message: string; offer?: PromoOffer }> {
    this.init();
    const cleanCode = code.trim().toUpperCase();
    const offer = this.offers.find((o) => o.code.toUpperCase() === cleanCode);

    if (!offer) {
      return { isValid: false, discountAmount: 0, message: `Coupon code "${code}" is invalid.` };
    }

    if (offer.status !== 'Active') {
      return { isValid: false, discountAmount: 0, message: `Offer "${offer.name}" is currently inactive.` };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (offer.startDate && offer.startDate > todayStr) {
      return { isValid: false, discountAmount: 0, message: `Offer is not active yet (Starts on ${offer.startDate}).` };
    }

    if (offer.endDate && offer.endDate < todayStr) {
      return { isValid: false, discountAmount: 0, message: `Offer expired on ${offer.endDate}.` };
    }

    if (offer.maxUses > 0 && offer.usageCount >= offer.maxUses) {
      return { isValid: false, discountAmount: 0, message: `Offer max usage limit reached (${offer.maxUses} uses).` };
    }

    if (centreId && offer.applicableCentres && !offer.applicableCentres.includes('all') && !offer.applicableCentres.includes(centreId)) {
      return { isValid: false, discountAmount: 0, message: 'Offer is not valid at this spa centre location.' };
    }

    if (serviceId && offer.applicableServices && !offer.applicableServices.includes('all') && !offer.applicableServices.includes(serviceId)) {
      return { isValid: false, discountAmount: 0, message: 'Offer is not applicable for the selected service.' };
    }

    let discountAmount = 0;
    if (offer.discountType === 'Percentage') {
      discountAmount = Math.round((basePrice * offer.discountValue) / 100);
    } else {
      discountAmount = Math.min(basePrice, offer.discountValue);
    }

    return {
      isValid: true,
      discountAmount,
      message: `${offer.discountType === 'Percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`} Discount Applied (${offer.code})`,
      offer,
    };
  }

  async recordOfferUsage(id: string): Promise<void> {
    this.init();
    const item = this.offers.find((o) => o.id === id);
    if (item) {
      item.usageCount += 1;
      this.save();
    }
  }
}

export const offerService = new OfferService();
