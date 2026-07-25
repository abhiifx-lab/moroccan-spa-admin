import { Centre } from '../types/centre.types';

const STORAGE_KEY = 'admin_centres_v1';

export const INITIAL_CENTRES: Centre[] = [
  {
    id: 'loc_1',
    name: 'Moroccan Spa Gomti Nagar Flagship',
    code: 'LKO-GTI',
    city: 'Lucknow',
    address: 'Riverside Mall Road, Gomti Nagar, Lucknow 226010',
    phone: '+91 522 400 1122',
    email: 'gomtinagar@moroccanspa.in',
    totalRooms: 12,
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'loc_2',
    name: 'Moroccan Spa Hazratganj Luxury',
    code: 'LKO-HZG',
    city: 'Lucknow',
    address: 'MG Marg, Hazratganj, Lucknow 226001',
    phone: '+91 522 400 3344',
    email: 'hazratganj@moroccanspa.in',
    totalRooms: 10,
    isActive: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'loc_3',
    name: 'Moroccan Spa Indira Nagar',
    code: 'LKO-IND',
    city: 'Lucknow',
    address: 'Faizabad Road, Indira Nagar, Lucknow 226016',
    phone: '+91 522 400 5566',
    email: 'indiranagar@moroccanspa.in',
    totalRooms: 8,
    isActive: true,
    createdAt: '2026-02-01',
  },
  {
    id: 'loc_4',
    name: 'Moroccan Spa Aliganj Wellness',
    code: 'LKO-ALG',
    city: 'Lucknow',
    address: 'Kapoorthala, Aliganj, Lucknow 226024',
    phone: '+91 522 400 7788',
    email: 'aliganj@moroccanspa.in',
    totalRooms: 10,
    isActive: true,
    createdAt: '2026-02-15',
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
