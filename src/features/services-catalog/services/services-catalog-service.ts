export interface SpaServiceItem {
  id: string;
  name: string;
  category:
    | 'Massages'
    | 'Express & Targeted'
    | 'Body Treatments'
    | 'Facials & Hair'
    | 'Hydro & Thermal'
    | 'Couple Packages'
    | 'Add-Ons'
    | 'Hammam';
  durationMins: number;
  price: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const STORAGE_KEY = 'admin_services_catalog_v6_official_menu';

export const INITIAL_SERVICES: SpaServiceItem[] = [
  // --- MASSAGES ---
  { id: 'srv_swe_30', name: 'Swedish Massage (30 Min)', category: 'Massages', durationMins: 30, price: 3499, description: 'Classic light to medium pressure relaxation massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_swe_60', name: 'Swedish Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5499, description: 'Classic light to medium pressure full-body relaxation massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_swe_90', name: 'Swedish Massage (90 Min)', category: 'Massages', durationMins: 90, price: 6999, description: 'Extended full-body Swedish relaxation massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_swe_120', name: 'Swedish Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: 'Luxury 2-hour full-body deep relaxation Swedish session.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_dt_30', name: 'Deep Tissue Massage (30 Min)', category: 'Massages', durationMins: 30, price: 3499, description: 'Targeted deep muscle tension relief.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_dt_60', name: 'Deep Tissue Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5499, description: 'Firm pressure massage targeting deep muscle layers.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_dt_90', name: 'Deep Tissue Massage (90 Min)', category: 'Massages', durationMins: 90, price: 6999, description: 'Comprehensive deep tissue therapy for chronic muscle stiffness.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_dt_120', name: 'Deep Tissue Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: 'Ultimate 2-hour intense deep tissue therapeutic massage.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_bali_30', name: 'Balinese Massage (30 Min)', category: 'Massages', durationMins: 30, price: 3499, description: 'Traditional Indonesian acupressure and gentle stretch massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_bali_60', name: 'Balinese Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5499, description: 'Harmonious blend of gentle stretches, acupressure & aromatic oils.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_bali_90', name: 'Balinese Massage (90 Min)', category: 'Massages', durationMins: 90, price: 6999, description: 'Deeply soothing Balinese ritual for energy balance.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_bali_120', name: 'Balinese Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: '2-Hour holistic Balinese rejuvenation treatment.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_aroma_30', name: 'Aromatherapy Massage (30 Min)', category: 'Massages', durationMins: 30, price: 3499, description: 'Therapeutic essential oils massage for rapid stress relief.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_aroma_60', name: 'Aromatherapy Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5499, description: 'Custom botanical essential oil full-body soothing massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_aroma_90', name: 'Aromatherapy Massage (90 Min)', category: 'Massages', durationMins: 90, price: 6999, description: 'Deep sensory relaxation with premium aromatic essence oils.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_aroma_120', name: 'Aromatherapy Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: 'Complete 2-hour sensory bliss and mind-body harmony.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_thai_60', name: 'Thai Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5999, description: 'Traditional oil-free passive stretching & pressure point therapy.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_thai_90', name: 'Thai Massage (90 Min)', category: 'Massages', durationMins: 90, price: 7499, description: 'Extended assisted yoga stretches & joint mobilization.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_thai_120', name: 'Thai Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: '2-Hour master Thai stretching & energy line alignment.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_hs_60', name: 'Hot Stone Massage (60 Min)', category: 'Massages', durationMins: 60, price: 6499, description: 'Smooth heated basalt stones for deep muscle warmth & relaxation.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hs_90', name: 'Hot Stone Massage (90 Min)', category: 'Massages', durationMins: 90, price: 7999, description: 'Deep thermal stone therapy targeting tension & stiffness.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hs_120', name: 'Hot Stone Massage (120 Min)', category: 'Massages', durationMins: 120, price: 9499, description: 'Luxury 2-hour thermal stone ritual for total rejuvenation.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_sports_60', name: 'Sports Massage (60 Min)', category: 'Massages', durationMins: 60, price: 5999, description: 'Active muscle recovery & trigger point relief for athletes.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_sports_90', name: 'Sports Massage (90 Min)', category: 'Massages', durationMins: 90, price: 7499, description: 'Deep tissue sports therapy & flexibility enhancement.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_sports_120', name: 'Sports Massage (120 Min)', category: 'Massages', durationMins: 120, price: 8999, description: 'Comprehensive athletic recovery session for fatigue & soreness.', status: 'Active', createdAt: '2026-01-01' },

  // --- EXPRESS & TARGETED ---
  { id: 'srv_refl_30', name: 'Reflexology (30 Min)', category: 'Express & Targeted', durationMins: 30, price: 2999, description: 'Pressure point stimulation on feet & hands.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_refl_45', name: 'Reflexology (45 Min)', category: 'Express & Targeted', durationMins: 45, price: 3999, description: 'Targeted nerve end stimulation for internal wellness.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_refl_60', name: 'Reflexology (60 Min)', category: 'Express & Targeted', durationMins: 60, price: 4999, description: 'Full 60-min foot & hand reflexology therapy.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_hns_30', name: 'Head, Neck & Shoulder Massage (30 Min)', category: 'Express & Targeted', durationMins: 30, price: 2999, description: 'Quick relief for upper body desk fatigue.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hns_45', name: 'Head, Neck & Shoulder Massage (45 Min)', category: 'Express & Targeted', durationMins: 45, price: 3999, description: 'Focused therapy for neck tightness & headache relief.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hns_60', name: 'Head, Neck & Shoulder Massage (60 Min)', category: 'Express & Targeted', durationMins: 60, price: 4999, description: 'Deep pressure work on cervical & trap muscles.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_foot_30', name: 'Foot Massage (30 Min)', category: 'Express & Targeted', durationMins: 30, price: 2999, description: 'Relaxing foot soak & massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_foot_45', name: 'Foot Massage (45 Min)', category: 'Express & Targeted', durationMins: 45, price: 3999, description: 'Soothing foot & calf massage.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_foot_60', name: 'Foot Massage (60 Min)', category: 'Express & Targeted', durationMins: 60, price: 4999, description: 'Deep foot & lower leg therapeutic massage.', status: 'Active', createdAt: '2026-01-01' },

  // --- BODY TREATMENTS ---
  { id: 'srv_scrub_45', name: 'Body Scrub (45 Min)', category: 'Body Treatments', durationMins: 45, price: 3999, description: 'Exfoliating organic botanical scrub for dead skin removal.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_scrub_60', name: 'Body Scrub (60 Min)', category: 'Body Treatments', durationMins: 60, price: 4999, description: 'Full-body exfoliating scrub & skin nourishment.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_polish_60', name: 'Body Polish (60 Min)', category: 'Body Treatments', durationMins: 60, price: 5499, description: 'Luminous skin polishing with Moroccan argan cream.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_polish_90', name: 'Body Polish (90 Min)', category: 'Body Treatments', durationMins: 90, price: 6999, description: 'Deep skin brightening, exfoliation & moisturizing polish.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_wrap_60', name: 'Body Wrap (60 Min)', category: 'Body Treatments', durationMins: 60, price: 5999, description: 'Detoxifying Moroccan Rhassoul clay body wrap.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_wrap_90', name: 'Body Wrap (90 Min)', category: 'Body Treatments', durationMins: 90, price: 7499, description: 'Thermal detox wrap with hydrating skin firming mask.', status: 'Active', createdAt: '2026-01-01' },

  // --- FACIALS & HAIR ---
  { id: 'srv_fac_basic_45', name: 'Facial (Basic) (45 Min)', category: 'Facials & Hair', durationMins: 45, price: 3499, description: 'Cleansing & hydrating organic facial.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_fac_basic_60', name: 'Facial (Basic) (60 Min)', category: 'Facials & Hair', durationMins: 60, price: 4499, description: 'Deep pore cleansing, steam & moisturizing facial.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_fac_gold_60', name: 'Gold Facial (60 Min)', category: 'Facials & Hair', durationMins: 60, price: 5499, description: '24K Gold radiance facial for skin rejuvenation & glow.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_fac_gold_90', name: 'Gold Facial (90 Min)', category: 'Facials & Hair', durationMins: 90, price: 6999, description: 'Luxury 90-min 24K Gold skin restoration & anti-aging facial.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_fac_diamond_60', name: 'Diamond Facial (60 Min)', category: 'Facials & Hair', durationMins: 60, price: 5999, description: 'Microdermabrasion & diamond dust skin brightening facial.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_fac_diamond_90', name: 'Diamond Facial (90 Min)', category: 'Facials & Hair', durationMins: 90, price: 7499, description: 'Premium diamond dermal rejuvenation & firming mask.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_fac_hydra_60', name: 'Hydra Facial (60 Min)', category: 'Facials & Hair', durationMins: 60, price: 6999, description: 'Advanced hydro-dermabrasion deep cleansing & serum infusion.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_fac_hydra_90', name: 'Hydra Facial (90 Min)', category: 'Facials & Hair', durationMins: 90, price: 8499, description: 'Ultimate multi-step Hydra facial with LED light therapy.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_hair_45', name: 'Hair Spa (45 Min)', category: 'Facials & Hair', durationMins: 45, price: 2999, description: 'Nourishing argan oil scalp massage & hair mask.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hair_60', name: 'Hair Spa (60 Min)', category: 'Facials & Hair', durationMins: 60, price: 3999, description: 'Deep conditioning steam hair spa & scalp therapy.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_hair_90', name: 'Hair Spa (90 Min)', category: 'Facials & Hair', durationMins: 90, price: 5499, description: 'Intense keratin & argan oil repair treatment.', status: 'Active', createdAt: '2026-01-01' },

  // --- HYDRO & THERMAL ---
  { id: 'srv_steam_20', name: 'Steam (20 Min)', category: 'Hydro & Thermal', durationMins: 20, price: 999, description: 'Eucalyptus infused steam bath session.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_sauna_30', name: 'Sauna (30 Min)', category: 'Hydro & Thermal', durationMins: 30, price: 1499, description: 'Dry cedarwood sauna heat therapy.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_jacuzzi_30', name: 'Jacuzzi (30 Min)', category: 'Hydro & Thermal', durationMins: 30, price: 1999, description: 'Hydrotherapy whirlpool jacuzzi bath.', status: 'Active', createdAt: '2026-01-01' },

  // --- COUPLE THERAPIES ---
  { id: 'srv_cpl_msg_60', name: 'Couple Massage (60 Min)', category: 'Couple Packages', durationMins: 60, price: 10999, description: 'Side-by-side full body relaxation massage for two in private suite.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_cpl_msg_90', name: 'Couple Massage (90 Min)', category: 'Couple Packages', durationMins: 90, price: 13999, description: 'Extended 90-min romantic massage session for couples.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_cpl_msg_120', name: 'Couple Massage (120 Min)', category: 'Couple Packages', durationMins: 120, price: 16999, description: 'Luxury 2-hour couple massage ritual with herbal tea.', status: 'Active', createdAt: '2026-01-01' },

  { id: 'srv_cpl_pkg_120', name: 'Couple Spa Package (120 Min)', category: 'Couple Packages', durationMins: 120, price: 18999, description: 'Couple massage, steam bath & private jacuzzi experience.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'srv_cpl_pkg_180', name: 'Couple Spa Package (180 Min)', category: 'Couple Packages', durationMins: 180, price: 24999, description: '3-Hour royal couple retreat with scrub, massage, steam & beverages.', status: 'Active', createdAt: '2026-01-01' },

  // --- ADD-ONS ---
  { id: 'addon_hot_stone', name: 'Hot Stone Upgrade', category: 'Add-Ons', durationMins: 15, price: 1000, description: 'Add hot basalt stones to any massage session.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_aroma', name: 'Aroma Oil Upgrade', category: 'Add-Ons', durationMins: 0, price: 500, description: 'Upgrade to custom therapeutic essential oils.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_prem_essential', name: 'Premium Essential Oil', category: 'Add-Ons', durationMins: 0, price: 700, description: 'Rare organic Moroccan argan & rose essential oil blend.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_steam', name: 'Steam Add-on', category: 'Add-Ons', durationMins: 15, price: 800, description: 'Eucalyptus steam add-on to any service.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_head', name: 'Head Massage Add-on', category: 'Add-Ons', durationMins: 15, price: 1200, description: 'Express scalp & head massage enhancement.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_foot', name: 'Foot Massage Add-on', category: 'Add-Ons', durationMins: 15, price: 1200, description: 'Express foot reflexology add-on.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_scrub', name: 'Body Scrub Add-on', category: 'Add-Ons', durationMins: 30, price: 2000, description: 'Express exfoliation body scrub add-on.', status: 'Active', createdAt: '2026-01-01' },
  { id: 'addon_polish', name: 'Body Polish Add-on', category: 'Add-Ons', durationMins: 30, price: 2500, description: 'Express skin polishing add-on.', status: 'Active', createdAt: '2026-01-01' },
];

class ServicesCatalogService {
  private services: SpaServiceItem[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.services = [...INITIAL_SERVICES];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.services = JSON.parse(stored);
      } else {
        this.services = [...INITIAL_SERVICES];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.services));
      }
    } catch {
      this.services = [...INITIAL_SERVICES];
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
