export interface SpaPackage {
  id: string;
  name: string;
  includedTreatments: string;
  totalPrice: number;
  validityDays: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const STORAGE_KEY = 'admin_packages_v6_official_menu';

export const INITIAL_PACKAGES: SpaPackage[] = [
  {
    id: 'pkg_relax',
    name: 'Relax Package',
    includedTreatments: 'Swedish Massage + Steam Bath (90 Min)',
    totalPrice: 6999,
    validityDays: 30,
    status: 'Active',
    createdAt: '2026-01-01',
  },
  {
    id: 'pkg_rejuvenation',
    name: 'Rejuvenation Package',
    includedTreatments: 'Massage + Exfoliating Body Scrub + Eucalyptus Steam (120 Min)',
    totalPrice: 8999,
    validityDays: 30,
    status: 'Active',
    createdAt: '2026-01-01',
  },
  {
    id: 'pkg_luxury_wellness',
    name: 'Luxury Wellness Package',
    includedTreatments: 'Full Body Massage + Organic Facial + Steam Bath (180 Min)',
    totalPrice: 12999,
    validityDays: 45,
    status: 'Active',
    createdAt: '2026-01-01',
  },
  {
    id: 'pkg_couple_escape',
    name: 'Couple Escape Package',
    includedTreatments: 'Couple Massage + Private Steam Session + Refreshments (180 Min)',
    totalPrice: 19999,
    validityDays: 60,
    status: 'Active',
    createdAt: '2026-01-01',
  },
];

class PackageService {
  private packages: SpaPackage[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.packages = [...INITIAL_PACKAGES];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.packages = JSON.parse(stored);
      } else {
        this.packages = [...INITIAL_PACKAGES];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.packages));
      }
    } catch {
      this.packages = [...INITIAL_PACKAGES];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.packages));
    }
  }

  async getPackages(): Promise<SpaPackage[]> {
    this.init();
    return [...this.packages];
  }

  async addPackage(data: Omit<SpaPackage, 'id' | 'createdAt'>): Promise<SpaPackage> {
    this.init();
    const newPackage: SpaPackage = {
      ...data,
      id: `pkg_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.packages.unshift(newPackage);
    this.save();
    return newPackage;
  }

  async updatePackage(id: string, updates: Partial<Omit<SpaPackage, 'id'>>): Promise<SpaPackage> {
    this.init();
    const item = this.packages.find((p) => p.id === id);
    if (!item) throw new Error('Package not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deletePackage(id: string): Promise<void> {
    this.init();
    const index = this.packages.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.packages.splice(index, 1);
      this.save();
    }
  }
}

export const packageService = new PackageService();
