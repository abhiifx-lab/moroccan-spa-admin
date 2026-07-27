// ============================================================
// BOOKING SERVICE — Refactored to use Business Day Engine
// ============================================================
// Write path: All bookings flow through UnifiedTransactionPipeline.
// Read path: Bookings are read from Supabase (bookings table).
// No localStorage. No OperationsEngine. No DomainEventBus.
// ============================================================

import { BookingItem, CreateBookingDTO, BookingStatus } from '../types/booking.types';
import { transactionPipeline } from '@/features/business-day-engine';
import { resolveCentreId, resolvePaymentMethod } from '@/features/business-day-engine/utils/centre-resolver';
import { createClient } from '@/lib/supabase/client';

class BookingService {
  private supabase = createClient();

  /**
   * Get all bookings from Supabase.
   * Filtered by centre_id if provided.
   */
  async getBookings(centreId?: string | null): Promise<BookingItem[]> {
    let query = this.supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (centreId) {
      const resolvedCentreId = resolveCentreId(centreId);
      query = query.eq('centre_id', resolvedCentreId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[BookingService] Failed to fetch bookings:', error);
      return [];
    }

    // Map Supabase rows to BookingItem for UI compatibility
    return (data || []).map((row: Record<string, unknown>) => this.mapSupabaseRowToBookingItem(row));
  }

  /**
   * Create a new booking.
   * 1. Insert into Supabase `bookings` table
   * 2. Record financial event via pipeline (if paid)
   */
  async createBooking(data: CreateBookingDTO): Promise<BookingItem> {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = data.bookingRef || `BK-2026-${randomCode}`;
    const centreUuid = resolveCentreId(data.locationId || 'loc_1');
    const dateStr = data.appointmentDate || new Date().toISOString().split('T')[0];

    // Step 1: Insert into Supabase bookings table
    const bookingPayload = {
      centre_id: centreUuid,
      booking_ref: bookingRef,
      customer_name: data.customerName,
      customer_phone: data.customerPhone || '9876543210',
      service_id: data.serviceId || 'srv_1',
      service_name: data.serviceName,
      service_duration: data.serviceDuration || '60 Mins',
      therapist_id: data.therapistId || null,
      therapist_name: data.therapistName || null,
      appointment_date: dateStr,
      appointment_time: data.appointmentTime && data.appointmentTime.includes(':')
        ? `${data.appointmentTime}:00`
        : '12:00:00',
      amount: data.amount,
      payment_status: data.paymentStatus || 'Paid',
      payment_method: data.paymentMethod || 'Cash at Desk',
      booking_status: 'Confirmed',
      notes: data.notes || '',
    };

    const { data: bkData, error: bkErr } = await this.supabase
      .from('bookings')
      .insert([bookingPayload])
      .select();

    if (bkErr) {
      console.error('[BookingService] Supabase insert failed:', bkErr);
      throw new Error(`Database error creating booking: ${bkErr.message}`);
    }

    const supabaseBookingId = bkData?.[0]?.id;

    // Step 2: Record financial event via Business Day Engine pipeline
    if (data.paymentStatus !== 'Pending' && data.amount > 0) {
      try {
        // Get current user ID from auth context
        const { data: { user } } = await this.supabase.auth.getUser();
        const userId = user?.id || 'system';

        await transactionPipeline.recordBookingSale({
          centreId: centreUuid,
          date: dateStr,
          amount: data.amount,
          paymentMethod: resolvePaymentMethod(data.paymentMethod || 'Cash at Desk'),
          bookingId: supabaseBookingId || `bk_${Date.now()}`,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          serviceName: data.serviceName,
          refCode: bookingRef,
          createdBy: userId,
        });
      } catch (pipelineErr) {
        console.error('[BookingService] Pipeline event recording failed:', pipelineErr);
        // Don't throw — the booking was already saved to Supabase.
        // The business event can be reconciled later.
      }
    }

    // Map back to BookingItem for UI
    return {
      id: supabaseBookingId || `bk_${Date.now()}`,
      bookingRef,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      serviceDuration: data.serviceDuration || '60 Mins',
      locationId: data.locationId || 'loc_1',
      locationName: data.locationName || 'Moroccan Spa Gomti Nagar Flagship',
      therapistId: data.therapistId,
      therapistName: data.therapistName,
      appointmentDate: dateStr,
      appointmentTime: data.appointmentTime,
      amount: data.amount,
      paymentStatus: data.paymentStatus || 'Paid',
      paymentMethod: data.paymentMethod || 'Cash at Desk',
      bookingStatus: 'Confirmed',
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Update booking status in Supabase.
   */
  async updateBookingStatus(id: string, bookingStatus: BookingStatus): Promise<BookingItem> {
    const { data, error } = await this.supabase
      .from('bookings')
      .update({ booking_status: bookingStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[BookingService] Status update failed:', error);
      throw new Error(`Failed to update booking status: ${error.message}`);
    }

    return this.mapSupabaseRowToBookingItem(data);
  }

  /**
   * Delete booking from Supabase.
   */
  async deleteBooking(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[BookingService] Delete failed:', error);
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  }

  /**
   * Map a Supabase bookings row to the BookingItem type used by UI components.
   */
  private mapSupabaseRowToBookingItem(row: Record<string, unknown>): BookingItem {
    return {
      id: row.id as string,
      bookingRef: (row.booking_ref || '') as string,
      customerName: (row.customer_name || '') as string,
      customerPhone: (row.customer_phone || '') as string,
      serviceId: (row.service_id || '') as string,
      serviceName: (row.service_name || '') as string,
      serviceDuration: (row.service_duration || '60 Mins') as string,
      locationId: (row.centre_id || '') as string,
      locationName: (row.centre_name || 'Moroccan Spa') as string,
      therapistId: (row.therapist_id || '') as string,
      therapistName: (row.therapist_name || '') as string,
      appointmentDate: (row.appointment_date || '') as string,
      appointmentTime: ((row.appointment_time || '') as string).substring(0, 5),
      amount: (row.amount || 0) as number,
      paymentStatus: (row.payment_status || 'Paid') as BookingItem['paymentStatus'],
      paymentMethod: (row.payment_method || 'Cash at Desk') as BookingItem['paymentMethod'],
      bookingStatus: (row.booking_status || 'Confirmed') as BookingItem['bookingStatus'],
      notes: (row.notes || '') as string,
      createdAt: (row.created_at || new Date().toISOString()) as string,
    };
  }
}

export const bookingService = new BookingService();
