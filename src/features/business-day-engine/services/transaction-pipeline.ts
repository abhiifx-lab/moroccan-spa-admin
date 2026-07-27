// ============================================================
// UNIFIED TRANSACTION PIPELINE
// ============================================================
// This is the ONLY write-path for financial events.
// Every booking, membership sale, gift card sale, expense,
// and cash movement must flow through this pipeline.
//
// The pipeline:
// 1. Ensures a BusinessDay exists for (centre, date)
// 2. Inserts a BusinessEvent into Supabase
// 3. DB triggers auto-recompute BusinessDay aggregates
// 4. DB triggers auto-post to General Ledger
// 5. Logs to audit trail
//
// NO localStorage. NO in-memory calculations.
// ============================================================

import { createClient } from '@/lib/supabase/client';
import { businessDayEngine } from './business-day-engine';
import type {
  BusinessEvent,
  BusinessEventInsert,
  PaymentMethod,
  CashMovementInsert,
  MembershipInsert,
  GiftCardInsert,
  AuditTrailInsert,
} from '../types/business-day.types';

// ---- Pipeline Input Types ----

export interface BookingSaleInput {
  centreId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  refCode?: string;
  taxAmount?: number;
  createdBy: string;
}

export interface MembershipSaleInput {
  centreId: string;
  date: string;
  membership: MembershipInsert;
  createdBy: string;
}

export interface GiftCardSaleInput {
  centreId: string;
  date: string;
  giftCard: GiftCardInsert;
  createdBy: string;
}

export interface ExpenseInput {
  centreId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  category: string;
  description: string;
  paidTo?: string;
  refCode?: string;
  createdBy: string;
}

export interface CashMovementInput {
  centreId: string;
  date: string;
  movement: CashMovementInsert;
}

export interface RefundInput {
  centreId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  originalBookingId?: string;
  originalEventId?: string;
  customerName: string;
  reason: string;
  createdBy: string;
}

export interface MembershipRedemptionInput {
  centreId: string;
  date: string;
  membershipId: string;
  amount: number;
  customerName: string;
  serviceName: string;
  bookingId?: string;
  createdBy: string;
}

export interface GiftCardRedemptionInput {
  centreId: string;
  date: string;
  giftCardId: string;
  amount: number;
  customerName: string;
  serviceName: string;
  bookingId?: string;
  createdBy: string;
}

class UnifiedTransactionPipeline {
  private supabase = createClient();

  // ============================================================
  // 1. BOOKING SALE
  // ============================================================
  async recordBookingSale(input: BookingSaleInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'booking_sale',
      payment_method: input.paymentMethod,
      amount: input.amount,
      booking_id: input.bookingId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      service_name: input.serviceName,
      ref_code: input.refCode,
      tax_amount: input.taxAmount,
      description: `Booking: ${input.serviceName} — ${input.customerName}`,
      created_by: input.createdBy,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.createdBy,
      user_role: 'receptionist',
      action: 'CREATE',
      target_table: 'business_events',
      record_id: event.id,
      new_value: { event_type: 'booking_sale', amount: input.amount, payment: input.paymentMethod },
    });

    return event;
  }

  // ============================================================
  // 2. MEMBERSHIP SALE
  // ============================================================
  async recordMembershipSale(input: MembershipSaleInput): Promise<{ membership: unknown; event: BusinessEvent }> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Insert membership record
    const { data: membership, error: memError } = await this.supabase
      .from('memberships')
      .insert(input.membership)
      .select()
      .single();

    if (memError) {
      throw new Error(`Failed to create membership: ${memError.message}`);
    }

    // Record the financial event
    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'membership_sale',
      payment_method: input.membership.payment_method,
      amount: input.membership.original_value,
      membership_id: membership.id,
      customer_name: input.membership.customer_name,
      customer_phone: input.membership.customer_phone,
      ref_code: input.membership.membership_number,
      description: `Membership Sale: ${input.membership.plan_name} — ${input.membership.customer_name}`,
      created_by: input.createdBy,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.createdBy,
      user_role: 'receptionist',
      action: 'CREATE',
      target_table: 'memberships',
      record_id: membership.id,
      new_value: { plan: input.membership.plan_name, value: input.membership.original_value },
    });

    return { membership, event };
  }

  // ============================================================
  // 3. GIFT CARD SALE
  // ============================================================
  async recordGiftCardSale(input: GiftCardSaleInput): Promise<{ giftCard: unknown; event: BusinessEvent }> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Insert gift card record
    const { data: giftCard, error: gcError } = await this.supabase
      .from('gift_cards')
      .insert(input.giftCard)
      .select()
      .single();

    if (gcError) {
      throw new Error(`Failed to create gift card: ${gcError.message}`);
    }

    // Record the financial event
    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'gift_card_sale',
      payment_method: input.giftCard.payment_method,
      amount: input.giftCard.face_value,
      gift_card_id: giftCard.id,
      customer_name: input.giftCard.purchased_by,
      ref_code: input.giftCard.code,
      description: `Gift Card Sale: ₹${input.giftCard.face_value} — For ${input.giftCard.recipient_name}`,
      created_by: input.createdBy,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.createdBy,
      user_role: 'receptionist',
      action: 'CREATE',
      target_table: 'gift_cards',
      record_id: giftCard.id,
      new_value: { code: input.giftCard.code, value: input.giftCard.face_value },
    });

    return { giftCard, event };
  }

  // ============================================================
  // 4. EXPENSE
  // ============================================================
  async recordExpense(input: ExpenseInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Insert expense into existing expenses table (preserve existing schema)
    const { data: expense, error: expError } = await this.supabase
      .from('expenses')
      .insert({
        centre_id: input.centreId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        payment_method: input.paymentMethod,
        paid_to: input.paidTo || '',
        recorded_by: input.createdBy,
      })
      .select()
      .single();

    if (expError) {
      console.warn('[Pipeline] expenses table insert failed (may not exist with new columns):', expError.message);
    }

    // Record the financial event
    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'expense',
      payment_method: input.paymentMethod,
      amount: input.amount,
      expense_id: expense?.id || undefined,
      category: input.category,
      ref_code: input.refCode,
      description: `Expense: ${input.category} — ${input.description}`,
      created_by: input.createdBy,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.createdBy,
      user_role: 'receptionist',
      action: 'CREATE',
      target_table: 'business_events',
      record_id: event.id,
      new_value: { event_type: 'expense', category: input.category, amount: input.amount },
    });

    return event;
  }

  // ============================================================
  // 5. CASH MOVEMENT
  // ============================================================
  async recordCashMovement(input: CashMovementInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Insert cash movement record
    const { data: movement, error: cmError } = await this.supabase
      .from('cash_movements')
      .insert(input.movement)
      .select()
      .single();

    if (cmError) {
      throw new Error(`Failed to create cash movement: ${cmError.message}`);
    }

    // Record the financial event
    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'cash_movement',
      payment_method: 'cash',
      amount: input.movement.amount,
      cash_movement_id: movement.id,
      category: input.movement.movement_type,
      description: `Cash Movement: ${input.movement.movement_type} — ${input.movement.description}`,
      created_by: input.movement.created_by,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.movement.created_by,
      user_role: 'receptionist',
      action: 'CREATE',
      target_table: 'cash_movements',
      record_id: movement.id,
      new_value: { type: input.movement.movement_type, amount: input.movement.amount },
    });

    return event;
  }

  // ============================================================
  // 6. REFUND
  // ============================================================
  async recordRefund(input: RefundInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'refund',
      payment_method: input.paymentMethod,
      amount: input.amount,
      booking_id: input.originalBookingId,
      refund_source_event_id: input.originalEventId,
      customer_name: input.customerName,
      description: `Refund: ${input.reason} — ${input.customerName}`,
      created_by: input.createdBy,
    });

    await this.logAudit({
      centre_id: input.centreId,
      business_day_id: businessDayId,
      user_id: input.createdBy,
      user_role: 'manager',
      action: 'CREATE',
      target_table: 'business_events',
      record_id: event.id,
      new_value: { event_type: 'refund', amount: input.amount, reason: input.reason },
      notify_owner: true,
    });

    return event;
  }

  // ============================================================
  // 7. MEMBERSHIP REDEMPTION (NOT revenue)
  // ============================================================
  async recordMembershipRedemption(input: MembershipRedemptionInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Deduct from membership balance
    const { data: membership, error: fetchError } = await this.supabase
      .from('memberships')
      .select('remaining_balance')
      .eq('id', input.membershipId)
      .single();

    if (fetchError || !membership) {
      throw new Error(`Membership not found: ${fetchError?.message}`);
    }

    const newBalance = membership.remaining_balance - input.amount;
    const newStatus = newBalance <= 0 ? 'Exhausted' : 'Active';

    const { error: updateError } = await this.supabase
      .from('memberships')
      .update({ remaining_balance: Math.max(0, newBalance), status: newStatus })
      .eq('id', input.membershipId);

    if (updateError) {
      throw new Error(`Failed to update membership balance: ${updateError.message}`);
    }

    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'membership_redemption',
      payment_method: 'membership_pass',
      amount: input.amount,
      membership_id: input.membershipId,
      booking_id: input.bookingId,
      customer_name: input.customerName,
      service_name: input.serviceName,
      description: `Membership Redemption: ${input.serviceName} — ${input.customerName}`,
      created_by: input.createdBy,
    });

    return event;
  }

  // ============================================================
  // 8. GIFT CARD REDEMPTION (NOT revenue)
  // ============================================================
  async recordGiftCardRedemption(input: GiftCardRedemptionInput): Promise<BusinessEvent> {
    const businessDayId = await businessDayEngine.ensureBusinessDay(input.centreId, input.date);

    // Deduct from gift card balance
    const { data: giftCard, error: fetchError } = await this.supabase
      .from('gift_cards')
      .select('remaining_balance')
      .eq('id', input.giftCardId)
      .single();

    if (fetchError || !giftCard) {
      throw new Error(`Gift card not found: ${fetchError?.message}`);
    }

    const newBalance = giftCard.remaining_balance - input.amount;
    const newStatus = newBalance <= 0 ? 'Exhausted' : 'Active';

    const { error: updateError } = await this.supabase
      .from('gift_cards')
      .update({ remaining_balance: Math.max(0, newBalance), status: newStatus })
      .eq('id', input.giftCardId);

    if (updateError) {
      throw new Error(`Failed to update gift card balance: ${updateError.message}`);
    }

    const event = await this.insertEvent({
      business_day_id: businessDayId,
      centre_id: input.centreId,
      date: input.date,
      event_type: 'gift_card_redemption',
      payment_method: 'gift_card',
      amount: input.amount,
      gift_card_id: input.giftCardId,
      booking_id: input.bookingId,
      customer_name: input.customerName,
      service_name: input.serviceName,
      description: `Gift Card Redemption: ${input.serviceName} — ${input.customerName}`,
      created_by: input.createdBy,
    });

    return event;
  }

  // ============================================================
  // PRIVATE: Core Event Insert
  // ============================================================
  private async insertEvent(eventData: BusinessEventInsert & { business_day_id: string }): Promise<BusinessEvent> {
    const { data, error } = await this.supabase
      .from('business_events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('[Pipeline] Failed to insert business event:', error);
      throw new Error(`Failed to insert business event: ${error.message}`);
    }

    return data as BusinessEvent;
  }

  // ============================================================
  // PRIVATE: Audit Trail Insert
  // ============================================================
  private async logAudit(entry: AuditTrailInsert): Promise<void> {
    const { error } = await this.supabase
      .from('audit_trail')
      .insert(entry);

    if (error) {
      // Audit logging should never block the main flow
      console.error('[Pipeline] Audit log insert failed:', error.message);
    }
  }
}

// Singleton export
export const transactionPipeline = new UnifiedTransactionPipeline();
