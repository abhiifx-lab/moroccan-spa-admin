// ============================================================
// GIFT CARD SERVICE — Refactored to use Business Day Engine
// ============================================================
// Write path: Sales and redemptions flow through pipeline.
// Read path: Gift cards read from Supabase gift_cards table.
// No localStorage. No OperationsEngine.
// ============================================================

import { transactionPipeline } from '@/features/business-day-engine';
import { resolveCentreId, resolvePaymentMethod } from '@/features/business-day-engine/utils/centre-resolver';
import { createClient } from '@/lib/supabase/client';

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
  code: string;
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

class GiftCardService {
  private supabase = createClient();

  /**
   * Get all gift cards from Supabase.
   */
  async getGiftCards(): Promise<GiftCardVoucher[]> {
    const { data, error } = await this.supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GiftCardService] Failed to fetch gift cards:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => this.mapRowToVoucher(row));
  }

  /**
   * Sell a new gift card via the Business Day Engine pipeline.
   */
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
    const dateStr = new Date().toISOString().split('T')[0];
    const seq = Math.floor(100000 + Math.random() * 900000);
    const code = data.customCode ? data.customCode.trim().toUpperCase() : `GC-2026-${seq}`;
    const centreUuid = resolveCentreId(data.centreId);

    let expiryDate: string | undefined = undefined;
    if (data.expiryDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + data.expiryDays);
      expiryDate = exp.toISOString().split('T')[0];
    }

    // Get current user ID
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';

    // Record via pipeline — inserts into gift_cards table AND creates business event
    const { giftCard } = await transactionPipeline.recordGiftCardSale({
      centreId: centreUuid,
      date: dateStr,
      giftCard: {
        code,
        face_value: data.faceValue,
        remaining_balance: data.faceValue,
        purchased_by: data.purchasedBy,
        recipient_name: data.recipientName,
        recipient_phone: data.recipientPhone,
        payment_method: resolvePaymentMethod(data.paymentMethod),
        selling_centre_id: centreUuid,
        expiry_date: expiryDate,
        created_by: userId,
      },
      createdBy: userId,
    });

    const gcRow = giftCard as Record<string, unknown>;
    return this.mapRowToVoucher(gcRow);
  }

  /**
   * Verify a gift card by code (cross-centre lookup).
   */
  async verifyGiftCard(code: string): Promise<GiftCardVoucher> {
    const cleanCode = code.trim().toUpperCase();

    const { data: card, error } = await this.supabase
      .from('gift_cards')
      .select('*')
      .ilike('code', cleanCode)
      .single();

    if (error || !card) {
      throw new Error(`Gift card code "${code}" not found.`);
    }

    if ((card.status as string) === 'Exhausted' || (card.remaining_balance as number) <= 0) {
      throw new Error(`Gift card "${code}" has zero remaining balance.`);
    }
    if ((card.status as string) === 'Expired') {
      throw new Error(`Gift card "${code}" is expired.`);
    }
    if (card.expiry_date) {
      const today = new Date().toISOString().split('T')[0];
      if ((card.expiry_date as string) < today) {
        // Auto-expire
        await this.supabase.from('gift_cards').update({ status: 'Expired' }).eq('id', card.id);
        throw new Error(`Gift card "${code}" expired on ${card.expiry_date}.`);
      }
    }

    return this.mapRowToVoucher(card);
  }

  /**
   * Redeem a gift card via the Business Day Engine pipeline.
   */
  async redeemGiftCard(
    code: string,
    amount: number,
    bookingRef: string,
    centreName: string,
    _staffName: string = 'Front Desk'
  ): Promise<GiftCardVoucher> {
    // Verify first
    const card = await this.verifyGiftCard(code);

    if (card.remainingBalance < amount) {
      throw new Error(`Insufficient gift card balance! Active balance: ₹${card.remainingBalance.toLocaleString('en-IN')}, Service cost: ₹${amount.toLocaleString('en-IN')}`);
    }

    // Get current user
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';
    const dateStr = new Date().toISOString().split('T')[0];

    // Resolve which centre is redeeming (may differ from selling centre)
    const { data: { user: authUser } } = await this.supabase.auth.getUser();
    const centreId = resolveCentreId(card.centreId); // Default to selling centre

    await transactionPipeline.recordGiftCardRedemption({
      centreId,
      date: dateStr,
      giftCardId: card.id,
      amount,
      customerName: card.recipientName,
      serviceName: bookingRef,
      createdBy: userId,
    });

    // Fetch updated card
    const { data: updated } = await this.supabase
      .from('gift_cards')
      .select('*')
      .eq('id', card.id)
      .single();

    return this.mapRowToVoucher(updated || card);
  }

  /**
   * Legacy compat method.
   */
  async addGiftCard(data: Omit<GiftCardVoucher, 'id' | 'createdAt' | 'remainingBalance' | 'purchaseDate' | 'purchasedBy' | 'centreId' | 'centreName' | 'redemptionHistory'> & { paymentMethod?: string; centreId?: string; centreName?: string }): Promise<GiftCardVoucher> {
    return this.sellGiftCard({
      faceValue: data.faceValue,
      purchasedBy: data.recipientName,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      paymentMethod: data.paymentMethod || 'Cash at Desk',
      centreId: data.centreId || 'loc_1',
      centreName: data.centreName || 'Moroccan Spa Gomti Nagar Flagship',
      customCode: data.code,
    });
  }

  async updateGiftCard(id: string, updates: Partial<Omit<GiftCardVoucher, 'id'>>): Promise<GiftCardVoucher> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.recipientName !== undefined) updatePayload.recipient_name = updates.recipientName;
    if (updates.recipientPhone !== undefined) updatePayload.recipient_phone = updates.recipientPhone;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.expiryDate !== undefined) updatePayload.expiry_date = updates.expiryDate;

    const { data, error } = await this.supabase
      .from('gift_cards')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update gift card: ${error.message}`);
    return this.mapRowToVoucher(data);
  }

  async deleteGiftCard(id: string): Promise<void> {
    console.warn('[GiftCardService] Gift cards should not be deleted — mark as Expired instead.');
    const { error } = await this.supabase
      .from('gift_cards')
      .update({ status: 'Expired' })
      .eq('id', id);
    if (error) throw new Error(`Failed to expire gift card: ${error.message}`);
  }

  async getGiftCardReports() {
    const giftCards = await this.getGiftCards();
    const totalSoldValue = giftCards.reduce((sum, g) => sum + g.faceValue, 0);
    const totalOutstandingLiability = giftCards.reduce((sum, g) => sum + g.remainingBalance, 0);
    const totalRedeemedValue = totalSoldValue - totalOutstandingLiability;
    const activeCount = giftCards.filter((g) => g.status === 'Active' && g.remainingBalance > 0).length;

    return {
      totalSold: giftCards.length,
      totalSoldValue,
      totalOutstandingLiability,
      totalRedeemedValue,
      activeCount,
    };
  }

  private mapRowToVoucher(row: Record<string, unknown>): GiftCardVoucher {
    return {
      id: row.id as string,
      code: (row.code || '') as string,
      faceValue: (row.face_value || 0) as number,
      remainingBalance: (row.remaining_balance || 0) as number,
      purchaseDate: (row.created_at || '') as string,
      purchasedBy: (row.purchased_by || '') as string,
      recipientName: (row.recipient_name || '') as string,
      recipientPhone: row.recipient_phone as string | undefined,
      expiryDate: row.expiry_date as string | undefined,
      status: (row.status || 'Active') as GiftCardVoucher['status'],
      centreId: (row.selling_centre_id || '') as string,
      centreName: '',
      redemptionHistory: [], // History now lives in business_events table
    };
  }
}

export const giftCardService = new GiftCardService();
