'use client';

import { useState, useEffect } from 'react';
import { BookingItem, PaymentMethod, PaymentStatus } from '@/features/bookings/types/booking.types';
import { bookingService } from '@/features/bookings/services/booking-service';
import { customerService, CustomerProfile } from '@/features/customers/services/customer-service';
import { offerService } from '@/features/offers/services/offer-service';
import { servicesCatalogService } from '@/features/services-catalog/services/services-catalog-service';
import { membershipService, CustomerMembership } from '@/features/memberships/services/membership-service';
import { giftCardService, GiftCardVoucher } from '@/features/gift-cards/services/gift-card-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, X, Calendar, Clock, User, Phone, Mail, Sparkles, CheckCircle2, Crown, Gift, AlertCircle } from 'lucide-react';
import { revalidateOperationalViews } from '@/app/actions/operations';

import { useCentreContext } from '@/features/centres/context/centre-context';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (booking: BookingItem) => void;
}

interface TherapyOption {
  id: string;
  name: string;
  baseName: string;
  duration: string;
  price: number;
}

const DEFAULT_THERAPIES: TherapyOption[] = [
  { id: 'srv_swe_60', name: 'Swedish Massage (60 Min)', baseName: 'Swedish Massage', duration: '60 Mins', price: 5499 },
  { id: 'srv_dt_60', name: 'Deep Tissue Massage (60 Min)', baseName: 'Deep Tissue Massage', duration: '60 Mins', price: 5499 },
  { id: 'srv_bali_60', name: 'Balinese Massage (60 Min)', baseName: 'Balinese Massage', duration: '60 Mins', price: 5499 },
  { id: 'srv_aroma_60', name: 'Aromatherapy Massage (60 Min)', baseName: 'Aromatherapy Massage', duration: '60 Mins', price: 5499 },
];

const DEFAULT_LOCATIONS = [
  { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio' },
  { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn' },
  { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall' },
];

function parseBaseTherapyName(rawName: string): string {
  return rawName.replace(/\s*\(\d+\s*Mins?\)/i, '').trim();
}

export function CreateBookingModal({ isOpen, onClose, onBookingCreated }: CreateBookingModalProps) {
  const { isSuperAdmin, activeCentreFilter, centres } = useCentreContext();

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [locationId, setLocationId] = useState(activeCentreFilter || DEFAULT_LOCATIONS[0].id);
  const [selectedTherapyName, setSelectedTherapyName] = useState('');
  const [therapyId, setTherapyId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('11:00');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponAppliedMessage, setCouponAppliedMessage] = useState('');
  const [notes, setNotes] = useState('');

  // Lock Location for Centre Admin Users
  useEffect(() => {
    if (activeCentreFilter && activeCentreFilter !== 'all') {
      setLocationId(activeCentreFilter);
    }
  }, [activeCentreFilter]);

  // Payment Controls
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash at Desk');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');

  // Membership Payment Selection
  const [availableMemberships, setAvailableMemberships] = useState<CustomerMembership[]>([]);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');

  // Gift Card Payment Selection
  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [verifiedGiftCard, setVerifiedGiftCard] = useState<GiftCardVoucher | null>(null);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);

  // Customer CRM Lookup & Catalogs
  const [existingProfile, setExistingProfile] = useState<CustomerProfile | null>(null);
  const [therapiesList, setTherapiesList] = useState<TherapyOption[]>(DEFAULT_THERAPIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlip, setCreatedSlip] = useState<{ booking: BookingItem; customer: CustomerProfile } | null>(null);

  // Load Services Catalog
  useEffect(() => {
    async function loadCatalog() {
      const dbServices = await servicesCatalogService.getServices();
      if (dbServices.length > 0) {
        setTherapiesList(
          dbServices.map((s) => ({
            id: s.id,
            name: s.name,
            baseName: parseBaseTherapyName(s.name),
            duration: `${s.durationMins} Mins`,
            price: s.price,
          }))
        );
      }
    }
    loadCatalog();
  }, []);

  // Filter Unique Base Therapy Names & Variations
  const uniqueTherapyNames = Array.from(new Set(therapiesList.map((t) => t.baseName)));
  const availableVariations = therapiesList.filter((t) => t.baseName === selectedTherapyName);

  const handleTherapyNameChange = (name: string) => {
    setSelectedTherapyName(name);
    const matching = therapiesList.filter((t) => t.baseName === name);
    if (matching.length > 0) {
      setTherapyId(matching[0].id);
    } else {
      setTherapyId('');
    }
  };

  // Phone Lookup Logic & Active Memberships fetch
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

        // Fetch active memberships for this phone
        const mems = await membershipService.getCustomerActiveMemberships(customerPhone);
        setAvailableMemberships(mems);
        if (mems.length > 0) {
          setSelectedMembershipId(mems[0].id);
        } else {
          setSelectedMembershipId('');
        }
      } else {
        setExistingProfile(null);
        setAvailableMemberships([]);
        setSelectedMembershipId('');
      }
    }
    searchCustomer();
  }, [customerPhone]);

  if (!isOpen) return null;

  const selectedTherapy = therapiesList.find((t) => t.id === therapyId);
  const selectedLocation = DEFAULT_LOCATIONS.find((l) => l.id === locationId) || DEFAULT_LOCATIONS[0];

  // Price Calculations
  const basePrice = selectedTherapy ? selectedTherapy.price : 0;
  const discountAmount = Math.round((basePrice * appliedDiscount) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Selected Membership Obj & Balance Preview
  const activeMembershipObj = availableMemberships.find((m) => m.id === selectedMembershipId);
  const membershipCurrentBal = activeMembershipObj ? activeMembershipObj.remainingBalance : 0;
  const membershipRemainingAfter = Math.max(0, membershipCurrentBal - finalPrice);

  // Gift Card Balance Preview
  const giftCardCurrentBal = verifiedGiftCard ? verifiedGiftCard.remainingBalance : 0;
  const giftCardRemainingAfter = Math.max(0, giftCardCurrentBal - finalPrice);

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
          setCouponAppliedMessage(`${matchedOffer.discountPercentage}% Discount Applied (${matchedOffer.code})`);
          toast.success(`${matchedOffer.discountPercentage}% discount applied!`);
        } else if (codeUpper === 'WELCOME25') {
          setAppliedDiscount(25);
          setCouponAppliedMessage('25% Welcome Discount Applied!');
          toast.success('25% Welcome Discount Applied!');
        } else {
          setAppliedDiscount(0);
          setCouponAppliedMessage('Invalid or Expired Coupon Code');
          toast.error('Invalid or expired coupon code.');
        }
  };

  // Verify Gift Card Handler
  const handleVerifyGiftCard = async () => {
    if (!giftCardCodeInput.trim()) {
      toast.error('Please enter a Gift Card code.');
      return;
    }
    setIsVerifyingGiftCard(true);
    try {
      const card = await giftCardService.verifyGiftCard(giftCardCodeInput);
      setVerifiedGiftCard(card);
      toast.success(`Gift Card Verified! Balance: ₹${card.remainingBalance.toLocaleString('en-IN')}`);
    } catch (err: any) {
      setVerifiedGiftCard(null);
      toast.error(err.message || 'Gift Card verification failed.');
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedTherapy) {
      toast.error('Please select Therapy, Full Name, and Phone Number.');
      return;
    }

    // Payment Source Validation
    if (paymentMethod === 'Membership') {
      if (!activeMembershipObj) {
        toast.error('No active customer membership selected!');
        return;
      }
      if (membershipCurrentBal < finalPrice) {
        toast.error(`Insufficient Membership Balance! Active: ₹${membershipCurrentBal.toLocaleString('en-IN')}, Required: ₹${finalPrice.toLocaleString('en-IN')}`);
        return;
      }
    }

    if (paymentMethod === 'Gift Card') {
      if (!verifiedGiftCard) {
        toast.error('Please verify a valid Gift Card code before confirming.');
        return;
      }
      if (giftCardCurrentBal < finalPrice) {
        toast.error(`Insufficient Gift Card Balance! Active: ₹${giftCardCurrentBal.toLocaleString('en-IN')}, Required: ₹${finalPrice.toLocaleString('en-IN')}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Create Booking Record
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
        appointmentTime,
        amount: finalPrice,
        paymentStatus,
        paymentMethod,
        bookingStatus: 'Confirmed',
        notes: notes ? `${notes} ${appliedDiscount > 0 ? `[Coupon ${couponCode} - ${appliedDiscount}% Off]` : ''}` : undefined,
      });

      // 2. Consume Membership or Gift Card Balance if applicable
      if (paymentMethod === 'Membership' && activeMembershipObj) {
        await membershipService.deductMembershipBalance(
          activeMembershipObj.id,
          finalPrice,
          newBooking.bookingRef,
          selectedLocation.name
        );
      } else if (paymentMethod === 'Gift Card' && verifiedGiftCard) {
        await giftCardService.redeemGiftCard(
          verifiedGiftCard.code,
          finalPrice,
          newBooking.bookingRef,
          selectedLocation.name,
          'Front Desk'
        );
      }

      // 3. Add or Update Global Master Customer CRM
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

      // 4. Trigger Server Action Cache Sync
      await revalidateOperationalViews();

      toast.success(`Transaction recorded successfully for ${newBooking.bookingRef}!`);

      if (onBookingCreated) {
        onBookingCreated(newBooking);
      }

      setCreatedSlip({ booking: newBooking, customer: updatedCustomer });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedSlip(null);
    onClose();
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transition-all my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {createdSlip ? 'Booking Slip Generated' : 'New Appointment & Sale Entry'}
              </h2>
              <Badge variant="blue">Instant OS Sync</Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {createdSlip ? 'Transaction recorded in Ledger.' : 'Fill details below to post instant booking transaction.'}
            </p>
          </div>
          <button onClick={handleResetAndClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdSlip ? (
          /* RECEIPT SLIP PREVIEW */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-blue-600">Moroccan Spa POS</span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{createdSlip.booking.locationName}</h3>
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
          /* FORM */
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
                  {existingProfile && <span className="text-[10px] text-emerald-600 font-bold">Existing Client</span>}
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
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Location</span>
                  {!isSuperAdmin && <span className="text-[10px] text-amber-600 font-extrabold uppercase">Locked to Assigned Outlet</span>}
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {(isSuperAdmin
                    ? (centres.length > 0 ? centres : DEFAULT_LOCATIONS)
                    : (centres.length > 0 ? centres : DEFAULT_LOCATIONS).filter((loc) => loc.id === activeCentreFilter || loc.id === locationId)
                  ).map((loc) => (
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
                  value={selectedTherapyName}
                  onChange={(e) => handleTherapyNameChange(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all"
                  required
                >
                  <option value="">Select Therapy</option>
                  {uniqueTherapyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Duration &amp; Price</label>
                <select
                  value={therapyId}
                  onChange={(e) => setTherapyId(e.target.value)}
                  disabled={!selectedTherapyName}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  {!selectedTherapyName ? (
                    <option value="">Select therapy first</option>
                  ) : (
                    availableVariations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.duration} — ₹{v.price.toLocaleString('en-IN')}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* ROW 4: Preferred Date | Preferred Time */}
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
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Preferred Time</label>
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

            {/* ROW 5: Payment Source Dropdown (Cash / Card / UPI / Membership / Gift Card) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Source</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus-glow transition-all"
              >
                <option value="Cash at Desk">Cash at Desk</option>
                <option value="Card Payment (POS)">Card Payment (POS)</option>
                <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                <option value="Membership">Membership Card (Stored Balance)</option>
                <option value="Gift Card">Gift Voucher Code</option>
              </select>
            </div>

            {/* MEMBERSHIP PREVIEW CARD */}
            {paymentMethod === 'Membership' && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                    <Crown className="w-4 h-4 text-amber-600" /> Customer Active Memberships
                  </span>
                  <Badge variant="gold">{availableMemberships.length} Available</Badge>
                </div>

                {availableMemberships.length > 0 ? (
                  <>
                    <select
                      value={selectedMembershipId}
                      onChange={(e) => setSelectedMembershipId(e.target.value)}
                      className="w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white border border-amber-300 dark:border-amber-700"
                    >
                      {availableMemberships.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.membershipName} ({m.membershipNumber}) — Bal: ₹{m.remainingBalance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                        <span className="text-[9px] text-slate-500 font-sans block">Current Bal</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">₹{membershipCurrentBal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                        <span className="text-[9px] text-slate-500 font-sans block">Service Cost</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">₹{finalPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                        <span className="text-[9px] text-slate-500 font-sans block">Remaining</span>
                        <span className={`font-bold text-xs ${membershipRemainingAfter >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₹{membershipRemainingAfter.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No active memberships found for phone #{customerPhone || 'N/A'}. Purchase a membership plan first.</span>
                  </div>
                )}
              </div>
            )}

            {/* GIFT CARD PREVIEW CARD */}
            {paymentMethod === 'Gift Card' && (
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                    <Gift className="w-4 h-4 text-purple-600" /> Gift Voucher Redemption
                  </span>
                  {verifiedGiftCard && <Badge variant="emerald">Verified Active</Badge>}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter Code (e.g. GC-2026-000183)"
                    value={giftCardCodeInput}
                    onChange={(e) => setGiftCardCodeInput(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyGiftCard}
                    disabled={isVerifyingGiftCard}
                    className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0"
                  >
                    {isVerifyingGiftCard ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                  </Button>
                </div>

                {verifiedGiftCard && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                      <span className="text-[9px] text-slate-500 font-sans block">Current Bal</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400 text-xs">₹{giftCardCurrentBal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                      <span className="text-[9px] text-slate-500 font-sans block">Service Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">₹{finalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
                      <span className="text-[9px] text-slate-500 font-sans block">Remaining</span>
                      <span className={`font-bold text-xs ${giftCardRemainingAfter >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₹{giftCardRemainingAfter.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROW 6: Coupon Code */}
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

            {/* Special Requests */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Special Requests</label>
              <textarea
                placeholder="Any special requests or medical concerns..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
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

            {/* Action Buttons */}
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
