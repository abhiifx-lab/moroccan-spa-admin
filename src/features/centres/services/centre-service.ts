import { Centre } from '../types/centre.types';

const STORAGE_KEY = 'admin_centres_v1';

export const INITIAL_CENTRES: Centre[] = [
  {
    id: 'loc_pallasio',
    name: 'Moroccan Spa - Phoenix Palassio',
    code: 'LKO-PAL',
    city: 'Lucknow',
    address: 'Amar Shaheed Path, Gomti Nagar Extension, Lucknow 226010',
    phone: '+91 522 400 1122',
    email: 'pallasio@moroccanspa.in',
    totalRooms: 12,
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'loc_holidayinn',
    name: 'Moroccan Spa - Holiday Inn',
    code: 'LKO-HI',
    city: 'Lucknow',
    address: 'Commercial Complex, Transport Nagar, Lucknow 226012',
    phone: '+91 522 400 3344',
    email: 'holidayinn@moroccanspa.in',
    totalRooms: 10,
    isActive: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'loc_lulumall',
    name: 'Moroccan Spa - Lulu Mall',
    code: 'LKO-LULU',
    city: 'Lucknow',
    address: 'Golf City, Sector 7, Shaheed Path, Lucknow 226030',
    phone: '+91 522 400 5566',
    email: 'lulumall@moroccanspa.in',
    totalRooms: 14,
    isActive: true,
    createdAt: '2026-02-01',
  },
];

class CentreService {
  private centres: Centre[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.centres = [...INITIAL_CENTRES];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.centres = JSON.parse(stored);
      } else {
        this.centres = [...INITIAL_CENTRES];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.centres));
      }
    } catch {
      this.centres = [...INITIAL_CENTRES];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.centres));
    }
  }

  async getCentres(): Promise<Centre[]> {
    this.init();
    return [...this.centres];
  }

  async getCentreById(id: string): Promise<Centre | null> {
    this.init();
    const found = this.centres.find((c) => c.id === id);
    return found ? { ...found } : null;
  }

  async createCentre(data: Omit<Centre, 'id' | 'createdAt'>): Promise<Centre> {
    this.init();
    const newCentre: Centre = {
      ...data,
      id: `loc_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.centres.push(newCentre);
    this.save();
    return newCentre;
  }
}

export const centreService = new CentreService();
