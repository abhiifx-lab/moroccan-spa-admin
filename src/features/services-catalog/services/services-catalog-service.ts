export interface SpaServiceItem {
  id: string;
  name: string;
  category: 'Hammam' | 'Massages' | 'Facials' | 'Body Scrubs' | 'Hydrotherapy';
  durationMins: number;
  price: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const STORAGE_KEY = 'admin_services_catalog_v5_clean';

export const INITIAL_SERVICES: SpaServiceItem[] = [];

class ServicesCatalogService {
  private services: SpaServiceItem[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.services = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.services = stored ? JSON.parse(stored) : [];
    } catch {
      this.services = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.services));
    }
  }

  async getServices(): Promise<SpaServiceItem[]> {
    this.init();
    return [...this.services];
  }

  async addService(data: Omit<SpaServiceItem, 'id' | 'createdAt'>): Promise<SpaServiceItem> {
    this.init();
    const newService: SpaServiceItem = {
      ...data,
      id: `srv_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.services.unshift(newService);
    this.save();
    return newService;
  }

  async updateService(id: string, updates: Partial<Omit<SpaServiceItem, 'id'>>): Promise<SpaServiceItem> {
    this.init();
    const item = this.services.find((s) => s.id === id);
    if (!item) throw new Error('Service not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deleteService(id: string): Promise<void> {
    this.init();
    const index = this.services.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.services.splice(index, 1);
      this.save();
    }
  }
}

export const servicesCatalogService = new ServicesCatalogService();
