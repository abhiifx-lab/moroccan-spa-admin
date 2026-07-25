import { BookingItem, CreateBookingDTO, BookingStatus } from '../types/booking.types';
import { domainEventBus } from '@/features/events/domain-event-bus';
import { operationsEngine } from '@/features/operations/services/operations-engine';

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
