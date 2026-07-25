'use client';

import { useState, useEffect } from 'react';
import { BookingItem, PaymentMethod, PaymentStatus } from '@/features/bookings/types/booking.types';
import { bookingService } from '@/features/bookings/services/booking-service';
import { customerService, CustomerProfile } from '@/features/customers/services/customer-service';
import { salesService } from '@/features/sales/services/sales-service';
import { offerService } from '@/features/offers/services/offer-service';
import { servicesCatalogService } from '@/features/services-catalog/services/services-catalog-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, X, Calendar, Clock, User, Phone, Mail, Sparkles, CheckCircle2, UserCheck, UserPlus, Tag } from 'lucide-react';
import { revalidateOperationalViews } from '@/app/actions/operations';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (booking: BookingItem) => void;
}

const DEFAULT_THERAPIES = [
  { id: 'srv_1', name: 'Royal Moroccan Hammam & Scrub', duration: '75 Mins', price: 4999 },
  { id: 'srv_2', name: 'Warm Argan Oil Deep Tissue Massage', duration: '60 Mins', price: 3499 },
  { id: 'srv_3', name: 'Atlas Mountain Botanical Facial', duration: '45 Mins', price: 2999 },
  { id: 'srv_4', name: 'Rosewater & Clay Exfoliating Package', duration: '120 Mins', price: 7999 },
];

const DEFAULT_LOCATIONS = [
  { id: 'loc_1', name: 'Gomti Nagar Flagship Spa' },
  { id: 'loc_2', name: 'Hazratganj Luxury Spa' },
  { id: 'loc_3', name: 'Indira Nagar Spa' },
  { id: 'loc_4', name: 'Aliganj Wellness Center' },
];

export function CreateBookingModal({ isOpen, onClose, onBookingCreated }: CreateBookingModalProps) {
  // Form Fields matching screenshot
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [locationId, setLocationId] = useState(DEFAULT_LOCATIONS[0].id);
  const [therapyId, setTherapyId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('11:00'); // HH:mm precise minute selection
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // Discount percentage or amount
  const [couponAppliedMessage, setCouponAppliedMessage] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Controls
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash at Desk');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');

  // Customer CRM Lookup & Catalogs
  const [existingProfile, setExistingProfile] = useState<CustomerProfile | null>(null);
  const [therapiesList, setTherapiesList] = useState(DEFAULT_THERAPIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlip, setCreatedSlip] = useState<{ booking: BookingItem; customer: CustomerProfile } | null>(null);

  // Load Services from Catalog Service
  useEffect(() => {
    async function loadCatalog() {
      const dbServices = await servicesCatalogService.getServices();
      if (dbServices.length > 0) {
        setTherapiesList(
          dbServices.map((s) => ({
            id: s.id,
            name: s.name,
            duration: `${s.durationMins} Mins`,
            price: s.price,
          }))
        );
      }
    }
    loadCatalog();
  }, []);

  // Phone Lookup Logic
  useEffect(() => {
    async function searchCustomer() {
      if (customerPhone.length >= 6) {
        const match = await customerService.findByPhone(customerPhone);
        if (match) {
          setExistingProfile(match);
          setCustomerName(match.name);
          setCustomerEmail(match.email || '');
        } else {
          setExistingProfile(null);
        }
      } else {
        setExistingProfile(null);
      }
    }
    searchCustomer();
  }, [customerPhone]);

  if (!isOpen) return null;

  const selectedTherapy = therapiesList.find((t) => t.id === therapyId);
  const selectedLocation = DEFAULT_LOCATIONS.find((l) => l.id === locationId) || DEFAULT_LOCATIONS[0];

  // Base & Discounted Price Calculation
  const basePrice = selectedTherapy ? selectedTherapy.price : 0;
  const discountAmount = Math.round((basePrice * appliedDiscount) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Apply Coupon Handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code.');
      return;
    }

    const codeUpper = couponCode.trim().toUpperCase();
    const offers = await offerService.getOffers();
    const matchedOffer = offers.find((o) => o.code === codeUpper && o.status === 'Active');

    if (matchedOffer) {
      setAppliedDiscount(matchedOffer.discountPercentage);
      setCouponAppliedMessage(`✓ ${matchedOffer.discountPercentage}% Discount Applied (${matchedOffer.code})`);
      toast.success(`${matchedOffer.discountPercentage}% discount applied!`);
    } else if (codeUpper === 'WELCOME25') {
      setAppliedDiscount(25);
      setCouponAppliedMessage('✓ 25% Welcome Discount Applied!');
      toast.success('25% Welcome Discount Applied!');
    } else {
      setAppliedDiscount(0);
      setCouponAppliedMessage('❌ Invalid or Expired Coupon Code');
      toast.error('Invalid or expired coupon code.');
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedTherapy) {
      toast.error('Please select Therapy, Full Name, and Phone Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Booking Record with Minute-by-Minute Time
      const newBooking = await bookingService.createBooking({
        customerName,
        customerPhone,
        customerEmail,
        serviceId: selectedTherapy.id,
        serviceName: selectedTherapy.name,
        serviceDuration: selectedTherapy.duration,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        therapistId: 'th_1',
        therapistName: 'Fatima Zohra',
        appointmentDate,
        appointmentTime, // e.g. "14:15" or "10:47 AM"
        amount: finalPrice,
        paymentStatus,
        paymentMethod,
        bookingStatus: 'Confirmed',
        notes: notes ? `${notes} ${appliedDiscount > 0 ? `[Coupon ${couponCode} - ${appliedDiscount}% Off]` : ''}` : undefined,
      });

      // 2. Add or Update Global Master Customer CRM
      const updatedCustomer = await customerService.addOrUpdateGlobalCustomer({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        centreId: selectedLocation.id,
        centreName: selectedLocation.name,
        bookingRef: newBooking.bookingRef,
        serviceName: selectedTherapy.name,
        amountSpent: finalPrice,
        therapistName: 'Fatima Zohra',
      });

      // 3. Trigger Server Action Cache Sync
      await revalidateOperationalViews();

      toast.success(`Transaction recorded successfully for ${newBooking.bookingRef}!`);
      setCreatedSlip({ booking: newBooking, customer: updatedCustomer });
      if (onBookingCreated) {
        onBookingCreated(newBooking);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleResetAndClose = () => {
    setCreatedSlip(null);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerEmail('');
    setTherapyId('');
    setCouponCode('');
    setAppliedDiscount(0);
    setCouponAppliedMessage('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#141c2e] border-none rounded-[24px] max-w-xl w-full p-6 sm:p-8 shadow-surface-lg space-y-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xl tracking-tight">
              Make an Appointment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Select therapy, precise minute-by-minute time slot, location, and apply coupons.
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINT SLIP VIEW */}
        {createdSlip ? (
          <div className="space-y-6 pt-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-center space-y-1">
              <div className="inline-flex p-2 bg-emerald-600 text-white rounded-xl mb-1">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Appointment Booked Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Sales ledger &amp; CRM updated for {createdSlip.booking.bookingRef}.
              </p>
            </div>

            {/* Printable Slip */}
            <div id="printable-booking-slip" className="p-6 bg-[#f6f8fb] dark:bg-slate-800/60 rounded-2xl space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base">MOROCCAN SPA &amp; WELLNESS</h2>
                  <p className="text-[11px] text-slate-500 font-bold">{createdSlip.booking.locationName}</p>
                </div>
                <div className="text-right font-mono">
                  <Badge variant="blue">{createdSlip.booking.bookingRef}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{createdSlip.customer.name}</p>
                  <p className="font-mono text-slate-600 dark:text-slate-400 text-xs">{createdSlip.customer.phone}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Slot</span>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">{createdSlip.booking.appointmentDate}</p>
                  <p className="font-mono text-blue-600 dark:text-blue-400 font-extrabold text-xs">{createdSlip.booking.appointmentTime}</p>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 dark:border-slate-700 py-3 space-y-1">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                  <span>{createdSlip.booking.serviceName}</span>
                  <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    ₹{createdSlip.booking.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Payment Method: {createdSlip.booking.paymentMethod}</span>
                <span className="font-bold text-emerald-600">Status: {createdSlip.booking.paymentStatus}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={handleResetAndClose} className="rounded-xl border-none bg-slate-100">
                Close
              </Button>
              <Button size="sm" onClick={handlePrintSlip} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                Print Slip
              </Button>
            </div>
          </div>
        ) : (
          /* FORM MATCHING SCREENSHOT EXACTLY */
          <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs font-medium">
            {/* ROW 1: Full Name | Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Full Name</label>
                <Input
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-11 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Phone Number</span>
                  {existingProfile && <span className="text-[10px] text-emerald-600 font-bold">✓ Existing Client</span>}
                </label>
                <Input
                  placeholder="+91 XXXXX XXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* ROW 2: Email | Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-11 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Location</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all"
                >
                  <option value="" disabled>Select Location</option>
                  {DEFAULT_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 3: Therapy | Duration & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Therapy</label>
                <select
                  value={therapyId}
                  onChange={(e) => setTherapyId(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all"
                  required
                >
                  <option value="">Select Therapy</option>
                  {therapiesList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Duration &amp; Price</label>
                <div className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  {selectedTherapy ? (
                    <>
                      <span className="text-slate-600 dark:text-slate-400">{selectedTherapy.duration}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">
                        ₹{selectedTherapy.price.toLocaleString('en-IN')}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal">Select therapy first</span>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 4: Preferred Date | Preferred Time (Minute-by-Minute Precise Selection) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Preferred Date</label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="h-11 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Preferred Time <span className="text-[10px] text-blue-600 font-normal">(Minute-by-Minute Precise)</span>
                </label>
                <Input
                  type="time"
                  step="60"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* ROW 5: Coupon Code with Teal APPLY button */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Coupon Code</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono font-bold uppercase"
                />
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="h-11 px-6 rounded-xl bg-[#1b8882] hover:bg-[#156e69] text-white font-extrabold tracking-wider text-xs shrink-0 shadow-surface"
                >
                  APPLY
                </Button>
              </div>
              {couponAppliedMessage && (
                <p className={`text-[11px] font-bold mt-1 ${appliedDiscount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {couponAppliedMessage}
                </p>
              )}
            </div>

            {/* ROW 6: Special Requests */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Special Requests</label>
              <textarea
                placeholder="Any special requests or medical concerns..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-[#f6f8fb] dark:bg-slate-800 p-3 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus-glow transition-all outline-none resize-none"
              />
            </div>

            {/* Summary Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Total Payable Amount</span>
                {appliedDiscount > 0 && (
                  <p className="text-[11px] text-emerald-600 font-bold">Includes {appliedDiscount}% Coupon Discount</p>
                )}
              </div>
              <span className="text-2xl font-mono font-extrabold text-blue-600 dark:text-blue-400">
                ₹{finalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose} className="rounded-xl border-none bg-slate-100 h-10 px-5">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-6 shadow-surface flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Confirm Appointment'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
