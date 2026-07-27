export interface PromoOffer {
  id: string;
  code: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  usageCount: number;
  maxUses: number;
  status: 'Active' | 'Scheduled' | 'Expired';
  createdAt: string;
}

const STORAGE_KEY = 'admin_offers_v5_clean';

export const INITIAL_OFFERS: PromoOffer[] = [];

class OfferService {
  private offers: PromoOffer[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.offers = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.offers = stored ? JSON.parse(stored) : [];
    } catch {
      this.offers = [];
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

  async deleteOffer(id: string): Promise<void> {
    this.init();
    const index = this.offers.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.offers.splice(index, 1);
      this.save();
    }
  }
}

export const offerService = new OfferService();
