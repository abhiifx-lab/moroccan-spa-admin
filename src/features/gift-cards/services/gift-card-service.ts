import { operationsEngine } from '@/features/operations/services/operations-engine';

export interface GiftCardVoucher {
  id: string;
  code: string;
  faceValue: number;
  recipientName: string;
  recipientPhone: string;
  expiryDate: string;
  status: 'Active' | 'Redeemed' | 'Expired';
  createdAt: string;
}

const STORAGE_KEY = 'admin_gift_cards_v5_clean';

export const INITIAL_GIFT_CARDS: GiftCardVoucher[] = [];

class GiftCardService {
  private giftCards: GiftCardVoucher[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.giftCards = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.giftCards = stored ? JSON.parse(stored) : [];
    } catch {
      this.giftCards = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.giftCards));
    }
  }

  async getGiftCards(): Promise<GiftCardVoucher[]> {
    this.init();
    return [...this.giftCards];
  }

  async addGiftCard(data: Omit<GiftCardVoucher, 'id' | 'createdAt'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<GiftCardVoucher> {
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const newVoucher: GiftCardVoucher = {
      ...data,
      id: `gc_${Date.now()}`,
      createdAt: dateStr,
    };
    this.giftCards.unshift(newVoucher);
    this.save();

    // AUTO-RECORD OPERATIONAL TRANSACTION (Single Entry)
    try {
      await operationsEngine.addTransaction({
        type: 'gift_card',
        centreId: data.centreId || 'loc_1',
        centreName: data.centreName || 'Moroccan Spa Gomti Nagar Flagship',
        amount: newVoucher.faceValue,
        paymentMethod: data.paymentMethod || 'Cash at Desk',
        refCode: newVoucher.id,
        customerName: newVoucher.recipientName,
        remarks: `Gift Voucher Issued: ${newVoucher.code} for ${newVoucher.recipientName}`,
        date: dateStr,
      });
    } catch (err: unknown) {
      console.warn('Gift Card ops record warning:', err);
    }

    return newVoucher;
  }

  async updateGiftCard(id: string, updates: Partial<Omit<GiftCardVoucher, 'id'>>): Promise<GiftCardVoucher> {
    this.init();
    const item = this.giftCards.find((g) => g.id === id);
    if (!item) throw new Error('Gift Card voucher not found.');
    Object.assign(item, updates);
    this.save();
    return { ...item };
  }

  async deleteGiftCard(id: string): Promise<void> {
    this.init();
    const index = this.giftCards.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.giftCards.splice(index, 1);
      this.save();
    }
  }
}

export const giftCardService = new GiftCardService();
