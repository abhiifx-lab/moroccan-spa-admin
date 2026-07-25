export interface Therapist {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  centreId: string;
  centreName: string;
  rating: number;
  status: 'On Shift' | 'Off Shift' | 'On Leave';
  createdAt: string;
}

const STORAGE_KEY = 'admin_therapists_v5_clean';

export const INITIAL_THERAPISTS: Therapist[] = [];

class TherapistService {
  private therapists: Therapist[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.therapists = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.therapists = stored ? JSON.parse(stored) : [];
    } catch {
      this.therapists = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.therapists));
    }
  }

  async getTherapists(centreId?: string | null): Promise<Therapist[]> {
    this.init();
    if (!centreId) return [...this.therapists];
    return this.therapists.filter((t) => !t.centreId || t.centreId === centreId);
  }

  async addTherapist(data: Omit<Therapist, 'id' | 'rating' | 'createdAt'>): Promise<Therapist> {
    this.init();
    const newTherapist: Therapist = {
      ...data,
      id: `th_${Date.now()}`,
      rating: 5.0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.therapists.unshift(newTherapist);
    this.save();
    return newTherapist;
  }

  async updateTherapist(id: string, updates: Partial<Omit<Therapist, 'id'>>): Promise<Therapist> {
    this.init();
    const item = this.therapists.find((t) => t.id === id);
    if (!item) throw new Error('Therapist not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deleteTherapist(id: string): Promise<void> {
    this.init();
    const index = this.therapists.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.therapists.splice(index, 1);
      this.save();
    }
  }
}

export const therapistService = new TherapistService();
