import { operationsEngine } from '@/features/operations/services/operations-engine';

export interface GiftCardRedemptionEntry {
  id: string;
  date: string;
  bookingRef: string;
  centreName: string;
  staffName: string;
  amountUsed: number;
  remainingBalance: number;
}

export interface GiftCardVoucher {
  id: string;
  code: string; // e.g. GC-2026-000183
  faceValue: number;
  remainingBalance: number;
  purchaseDate: string;
  purchasedBy: string;
  recipientName: string;
  recipientPhone?: string;
  expiryDate?: string;
  status: 'Active' | 'Redeemed' | 'Expired' | 'Exhausted';
  centreId: string;
  centreName: string;
  redemptionHistory: GiftCardRedemptionEntry[];
}

const STORAGE_KEY = 'admin_gift_cards_v5_clean';

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

  async sellGiftCard(data: {
    faceValue: number;
    purchasedBy: string;
    recipientName: string;
    recipientPhone?: string;
    paymentMethod: string;
    centreId: string;
    centreName: string;
    customCode?: string;
    expiryDays?: number;
  }): Promise<GiftCardVoucher> {
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const seq = Math.floor(100000 + Math.random() * 900000);
    const code = data.customCode ? data.customCode.trim().toUpperCase() : `GC-2026-${seq}`;

    let expiryDate: string | undefined = undefined;
    if (data.expiryDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + data.expiryDays);
      expiryDate = exp.toISOString().split('T')[0];
    }

    const newVoucher: GiftCardVoucher = {
      id: `gc_${Date.now()}`,
      code,
      faceValue: data.faceValue,
      remainingBalance: data.faceValue,
      purchaseDate: dateStr,
      purchasedBy: data.purchasedBy,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      expiryDate,
      status: 'Active',
      centreId: data.centreId,
      centreName: data.centreName,
      redemptionHistory: [],
    };

    this.giftCards.unshift(newVoucher);
    this.save();

    // AUTO-RECORD OPERATIONAL TRANSACTION (Single Entry)
    try {
      await operationsEngine.addTransaction({
        type: 'gift_card',
        centreId: data.centreId,
        centreName: data.centreName,
        amount: data.faceValue,
        paymentMethod: data.paymentMethod,
        refCode: code,
        customerName: data.recipientName,
        remarks: `Gift Voucher Sale: ${code} (₹${data.faceValue.toLocaleString('en-IN')}) for ${data.recipientName}`,
        date: dateStr,
      });
    } catch (err: unknown) {
      console.warn('Gift Card ops record warning:', err);
    }

    return newVoucher;
  }

  async verifyGiftCard(code: string): Promise<GiftCardVoucher> {
    this.init();
    const cleanCode = code.trim().toUpperCase();
    const card = this.giftCards.find((g) => g.code.toUpperCase() === cleanCode);

    if (!card) throw new Error(`Gift card code "${code}" not found.`);
    if (card.status === 'Exhausted' || card.remainingBalance <= 0) {
      throw new Error(`Gift card "${code}" has zero remaining balance.`);
    }
    if (card.status === 'Expired') {
      throw new Error(`Gift card "${code}" is expired.`);
    }
    if (card.expiryDate) {
      const today = new Date().toISOString().split('T')[0];
      if (card.expiryDate < today) {
        card.status = 'Expired';
        this.save();
        throw new Error(`Gift card "${code}" expired on ${card.expiryDate}.`);
      }
    }

    return card;
  }

  async redeemGiftCard(
    code: string,
    amount: number,
    bookingRef: string,
    centreName: string,
    staffName: string = 'Front Desk'
  ): Promise<GiftCardVoucher> {
    this.init();
    const card = await this.verifyGiftCard(code);

    if (card.remainingBalance < amount) {
      throw new Error(`Insufficient gift card balance! Active balance: ₹${card.remainingBalance.toLocaleString('en-IN')}, Service cost: ₹${amount.toLocaleString('en-IN')}`);
    }

    const newBalance = card.remainingBalance - amount;
    card.remainingBalance = newBalance;

    if (newBalance <= 0) {
      card.status = 'Exhausted';
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const redemptionEntry: GiftCardRedemptionEntry = {
      id: `red_${Date.now()}`,
      date: dateStr,
      bookingRef,
      centreName,
      staffName,
      amountUsed: amount,
      remainingBalance: newBalance,
    };

    card.redemptionHistory.unshift(redemptionEntry);
    this.save();
    return { ...card };
  }

  async addGiftCard(data: Omit<GiftCardVoucher, 'id' | 'createdAt' | 'remainingBalance' | 'purchaseDate' | 'purchasedBy' | 'centreId' | 'centreName' | 'redemptionHistory'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<GiftCardVoucher> {
    return this.sellGiftCard({
      faceValue: data.faceValue,
      purchasedBy: data.recipientName,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      paymentMethod: data.paymentMethod || 'Cash at Desk',
      centreId: data.centreId || 'loc_pallasio',
      centreName: data.centreName || 'Moroccan Spa - Phoenix Palassio',
      customCode: data.code,
    });
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

  async getGiftCardReports() {
    this.init();
    const totalSoldValue = this.giftCards.reduce((sum, g) => sum + g.faceValue, 0);
    const totalOutstandingLiability = this.giftCards.reduce((sum, g) => sum + g.remainingBalance, 0);
    const totalRedeemedValue = totalSoldValue - totalOutstandingLiability;
    const activeCount = this.giftCards.filter((g) => g.status === 'Active' && g.remainingBalance > 0).length;

    return {
      totalSold: this.giftCards.length,
      totalSoldValue,
      totalOutstandingLiability,
      totalRedeemedValue,
      activeCount,
    };
  }
}

export const giftCardService = new GiftCardService();
