export type BookingStatus = 'Confirmed' | 'In Service' | 'Completed' | 'Pending' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid';
export type PaymentMethod = 'Cash at Desk' | 'UPI / Razorpay' | 'Credit / Debit Card' | 'Card Payment (POS)' | 'UPI / Online Transfer' | 'Gift Card' | 'Membership' | 'Membership Pass';

export interface BookingItem {
  id: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: string;
  locationId: string;
  locationName: string;
  therapistId: string;
  therapistName: string;
  appointmentDate: string;
  appointmentTime: string;
  amount: number; // in INR ₹
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  bookingStatus: BookingStatus;
  notes?: string;
  createdAt: string;
}

export type CreateBookingDTO = Omit<BookingItem, 'id' | 'bookingRef' | 'createdAt'> & { bookingRef?: string };
