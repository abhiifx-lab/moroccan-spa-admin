export interface PartnerHotel {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  commissionRate: number; // e.g. 15%
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const STORAGE_KEY = 'admin_hotels_v5_clean';

export const INITIAL_HOTELS: PartnerHotel[] = [];

class HotelService {
  private hotels: PartnerHotel[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.hotels = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.hotels = stored ? JSON.parse(stored) : [];
    } catch {
      this.hotels = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hotels));
    }
  }

  async getHotels(): Promise<PartnerHotel[]> {
    this.init();
    return [...this.hotels];
  }

  async addHotel(data: Omit<PartnerHotel, 'id' | 'createdAt'>): Promise<PartnerHotel> {
    this.init();
    const newHotel: PartnerHotel = {
      ...data,
      id: `ht_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.hotels.unshift(newHotel);
    this.save();
    return newHotel;
  }

  async updateHotel(id: string, updates: Partial<Omit<PartnerHotel, 'id'>>): Promise<PartnerHotel> {
    this.init();
    const item = this.hotels.find((h) => h.id === id);
    if (!item) throw new Error('Hotel not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deleteHotel(id: string): Promise<void> {
    this.init();
    const index = this.hotels.findIndex((h) => h.id === id);
    if (index !== -1) {
      this.hotels.splice(index, 1);
      this.save();
    }
  }
}

export const hotelService = new HotelService();
