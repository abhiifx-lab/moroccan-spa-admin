export interface SpaPackage {
  id: string;
  name: string;
  includedTreatments: string;
  totalPrice: number;
  validityDays: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const STORAGE_KEY = 'admin_packages_v5_clean';

export const INITIAL_PACKAGES: SpaPackage[] = [];

class PackageService {
  private packages: SpaPackage[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.packages = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.packages = stored ? JSON.parse(stored) : [];
    } catch {
      this.packages = [];
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
