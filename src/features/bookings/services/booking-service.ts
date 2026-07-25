import { BookingItem, CreateBookingDTO, BookingStatus } from '../types/booking.types';
import { domainEventBus } from '@/features/events/domain-event-bus';
import { operationsEngine } from '@/features/operations/services/operations-engine';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'admin_bookings_v3_clean';

export const INITIAL_BOOKINGS: BookingItem[] = [];

class BookingService {
  private bookings: BookingItem[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.bookings = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.bookings = stored ? JSON.parse(stored) : [];
    } catch {
      this.bookings = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookings));
    }
  }

  async getBookings(centreId?: string | null): Promise<BookingItem[]> {
    this.init();
    if (!centreId) return [...this.bookings];
    return this.bookings.filter((b) => !b.locationId || b.locationId === centreId);
  }

  async createBooking(data: CreateBookingDTO): Promise<BookingItem> {
    this.init();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newBooking: BookingItem = {
      id: `bk_${Date.now()}`,
      bookingRef: `BK-2026-${randomCode}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      serviceDuration: '60 Mins',
      therapistId: data.therapistId,
      therapistName: data.therapistName,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      amount: data.amount,
      locationId: data.locationId || 'loc_1',
      locationName: data.locationName || 'Moroccan Spa Gomti Nagar Flagship',
      paymentStatus: data.paymentStatus || 'Paid',
      paymentMethod: data.paymentMethod || 'Cash at Desk',
      bookingStatus: 'Confirmed',
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    // Insert directly into Supabase bookings table
    try {
      const supabase = createClient();
      if (supabase && 'from' in supabase) {
        const centreUuid = newBooking.locationId === 'loc_2'
          ? 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
          : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        const bookingPayload = {
          centre_id: centreUuid,
          booking_ref: newBooking.bookingRef,
          customer_name: newBooking.customerName,
          customer_phone: newBooking.customerPhone || '9876543210',
          service_id: newBooking.serviceId || 'srv_1',
          service_name: newBooking.serviceName,
          service_duration: data.serviceDuration || newBooking.serviceDuration || '60 Mins',
          therapist_id: newBooking.therapistId || null,
          therapist_name: newBooking.therapistName || null,
          appointment_date: newBooking.appointmentDate,
          appointment_time: newBooking.appointmentTime && newBooking.appointmentTime.includes(':') ? `${newBooking.appointmentTime}:00` : '12:00:00',
          amount: newBooking.amount,
          payment_status: newBooking.paymentStatus,
          payment_method: newBooking.paymentMethod,
          booking_status: newBooking.bookingStatus,
          notes: newBooking.notes || '',
        };

        console.log('Attempting Supabase Booking Insert with Payload:', bookingPayload);
        const { data: bkData, error: bkErr } = await supabase.from('bookings').insert([bookingPayload]).select();
        if (bkErr) {
          console.error('Supabase Booking Insert Failed:', bkErr);
          throw new Error(`Database error creating booking: ${bkErr.message}`);
        }
        console.log('Supabase Booking Insert Success:', bkData);
      }
    } catch (dbErr) {
      console.error('🚨 SUPABASE BOOKINGS INSERT EXCEPTION:', dbErr);
      throw dbErr;
    }

    this.bookings.unshift(newBooking);
    this.save();

    // AUTO-RECORD OPERATIONAL TRANSACTION WITH AWAIT & ERROR BUBBLING
    if (newBooking.paymentStatus === 'Paid' && newBooking.amount > 0) {
      try {
        await operationsEngine.addTransaction({
          type: 'booking',
          centreId: newBooking.locationId,
          centreName: newBooking.locationName,
          amount: newBooking.amount,
          paymentMethod: newBooking.paymentMethod,
          refCode: newBooking.bookingRef,
          customerName: newBooking.customerName,
          remarks: `${newBooking.serviceName} for ${newBooking.customerName}`,
          date: newBooking.appointmentDate,
          time: newBooking.appointmentTime && newBooking.appointmentTime.includes(':') ? `${newBooking.appointmentTime}:00` : undefined,
        });
      } catch (opsErr) {
        console.error('Booking operational transaction failed:', opsErr);
        throw new Error('Failed to record transaction in operations engine. Please try again.');
      }
    }

    return newBooking;
  }

  async updateBookingStatus(id: string, bookingStatus: BookingStatus): Promise<BookingItem> {
    this.init();
    const item = this.bookings.find((b) => b.id === id);
    if (!item) throw new Error('Booking not found.');
    item.bookingStatus = bookingStatus;
    this.save();
    return { ...item };
  }

  async deleteBooking(id: string): Promise<void> {
    this.init();
    const index = this.bookings.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.bookings.splice(index, 1);
      this.save();
    }
  }
}

export const bookingService = new BookingService();
