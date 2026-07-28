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
import { X, Search, Sparkles, Crown, MapPin, Plus, CheckCircle2, Ticket } from 'lucide-react';
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
  const { isSuperAdmin, activeCentreFilter } = useCentreContext();

  // Step 1: Mobile Number First
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [locationId, setLocationId] = useState(activeCentreFilter || DEFAULT_LOCATIONS[0].id);

  // Therapy Selection
  const [selectedTherapyName, setSelectedTherapyName] = useState('');
  const [therapyId, setTherapyId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('11:00');

  // Coupon / Offers Engine
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState<number>(0);
  const [couponAppliedMessage, setCouponAppliedMessage] = useState('');
  const [appliedOfferId, setAppliedOfferId] = useState<string | null>(null);

  const [notes, setNotes] = useState('');

  // Lock Location for Centre Admin Users
  useEffect(() => {
    if (activeCentreFilter && activeCentreFilter !== 'all') {
      setLocationId(activeCentreFilter);
    }
  }, [activeCentreFilter]);

  // Payment Controls (with UPI 1 and UPI 2 as First Class Options)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash at Desk');
  const [paymentStatus] = useState<PaymentStatus>('Paid');

  // Membership & Gift Card Payment Selections
  const [availableMemberships, setAvailableMemberships] = useState<CustomerMembership[]>([]);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');

  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [verifiedGiftCard, setVerifiedGiftCard] = useState<GiftCardVoucher | null>(null);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);

  // Customer CRM Profile Lookup
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

  // STEP 1: PHONE-FIRST CUSTOMER LOOKUP
  useEffect(() => {
    async function searchCustomer() {
      if (customerPhone.trim().length >= 6) {
        const match = await customerService.findByPhone(customerPhone.trim());
        if (match) {
          setExistingProfile(match);
          setCustomerName(match.name);
          setCustomerEmail(match.email || '');
          toast.success(`Client profile found: ${match.name}`);
        } else {
          setExistingProfile(null);
        }

        // Fetch active memberships for this phone
        const mems = await membershipService.getCustomerActiveMemberships(customerPhone.trim());
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

  // ZERO GST PRICE CALCULATIONS
  const basePrice = selectedTherapy ? selectedTherapy.price : 0;
  const finalPrice = Math.max(0, basePrice - appliedDiscountAmount);

  // Selected Membership & Gift Card Previews
  const activeMembershipObj = availableMemberships.find((m) => m.id === selectedMembershipId);
  const membershipCurrentBal = activeMembershipObj ? activeMembershipObj.remainingBalance : 0;

  const giftCardCurrentBal = verifiedGiftCard ? verifiedGiftCard.remainingBalance : 0;

  // Coupon / Offer Code Handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter an Offer / Coupon code.');
      return;
    }
    const res = await offerService.validateOffer(couponCode, basePrice, locationId, therapyId);
    if (res.isValid) {
      setAppliedDiscountAmount(res.discountAmount);
      setCouponAppliedMessage(res.message);
      setAppliedOfferId(res.offer?.id || null);
      toast.success(res.message);
    } else {
      setAppliedDiscountAmount(0);
      setCouponAppliedMessage(res.message);
      setAppliedOfferId(null);
      toast.error(res.message);
    }
  };

  // Gift Card Verification Handler
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
    if (!customerPhone || !customerName || !selectedTherapy) {
      toast.error('Please enter Mobile Number, Full Name, and select a Therapy.');
      return;
    }

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
      // 1. Create Booking Item
      const newBooking = await bookingService.createBooking({
        customerName,
        customerPhone,
        customerEmail,
        serviceId: selectedTherapy.id,
        serviceName: `${selectedTherapy.name}${couponAppliedMessage ? ` [Offer: ${couponCode}]` : ''}`,
        serviceDuration: selectedTherapy.duration,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        therapistId: 'th_fatima',
        therapistName: 'Fatima Zohra',
        appointmentDate,
        appointmentTime,
        amount: finalPrice,
        paymentStatus,
        paymentMethod,
        bookingStatus: 'Confirmed',
        notes: `${notes ? `${notes} | ` : ''}${couponAppliedMessage ? `Discount: ₹${appliedDiscountAmount} (${couponCode})` : ''}`,
      });

      // 2. Create or Update Customer Profile & Record Visit
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

      // 3. Deduct Membership if used
      if (paymentMethod === 'Membership' && activeMembershipObj) {
        await membershipService.deductMembershipBalance(
          activeMembershipObj.id,
          finalPrice,
          newBooking.bookingRef,
          selectedLocation.name
        );
      }

      // 4. Deduct Gift Card if used
      if (paymentMethod === 'Gift Card' && verifiedGiftCard) {
        await giftCardService.redeemGiftCard(
          verifiedGiftCard.code,
          finalPrice,
          newBooking.bookingRef,
          selectedLocation.name
        );
      }

      // 5. Record Offer Usage if applied
      if (appliedOfferId) {
        await offerService.recordOfferUsage(appliedOfferId);
      }

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transition-all my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {createdSlip ? 'Booking Invoice & Receipt' : 'New Appointment & Sale Entry'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {createdSlip ? 'Transaction recorded in Ledger.' : 'Step 1: Enter Customer Mobile Number to Lookup Profile.'}
            </p>
          </div>
          <button onClick={handleResetAndClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdSlip ? (
          /* RECEIPT / INVOICE PREVIEW */
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</span>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">{createdSlip.booking.appointmentDate}</p>
                  <p className="font-mono text-blue-600 dark:text-blue-400 font-extrabold text-xs">{createdSlip.booking.appointmentTime}</p>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 dark:border-slate-700 py-3 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                  <span>{createdSlip.booking.serviceName}</span>
                  <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-base">
                    ₹{createdSlip.booking.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Tax (GST):</span>
                  <span>₹0 (GST Exempt)</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Payment Method: <strong>{createdSlip.booking.paymentMethod}</strong></span>
                <span className="font-bold text-emerald-600">Status: {createdSlip.booking.paymentStatus}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={handleResetAndClose} className="rounded-xl">
                Close
              </Button>
              <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                Print Invoice
              </Button>
            </div>
          </div>
        ) : (
          /* FORM */
          <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs font-medium">
            {/* STEP 1: MOBILE NUMBER FIRST */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                  <span>STEP 1: Enter Customer Mobile Number</span>
                  {existingProfile && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Existing Profile Found
                    </span>
                  )}
                </label>
                <Input
                  placeholder="+91 XXXXX XXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                  required
                />
              </div>

              {/* Auto-filled Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Customer Full Name</label>
                  <Input
                    placeholder="Enter Client Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 rounded-lg text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Email Address (Optional)</label>
                  <Input
                    type="email"
                    placeholder="client@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-10 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Location & Therapy Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Spa Location</span>
                  {!isSuperAdmin && <span className="text-[10px] text-amber-600 font-extrabold">Assigned Branch</span>}
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={!isSuperAdmin && !!activeCentreFilter && activeCentreFilter !== 'all'}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {DEFAULT_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Select Spa Treatment</label>
                <select
                  value={selectedTherapyName}
                  onChange={(e) => handleTherapyNameChange(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-900 dark:text-white"
                  required
                >
                  <option value="">-- Choose Spa Treatment --</option>
                  {uniqueTherapyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration Variation */}
            {selectedTherapyName && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Duration & Pricing Option</label>
                <select
                  value={therapyId}
                  onChange={(e) => setTherapyId(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-bold text-blue-600 dark:text-blue-400"
                  required
                >
                  {availableVariations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.duration} — ₹{v.price.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Appointment Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Appointment Date</label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="h-11 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Appointment Time</label>
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

            {/* COUPON / OFFER CODE SECTION */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Coupon / Offer Code</span>
                {couponAppliedMessage && <span className="text-[10px] text-emerald-600 font-bold">{couponAppliedMessage}</span>}
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Coupon Code (e.g. WELCOME25, ROYAL500)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl text-xs font-mono font-bold uppercase"
                />
                <Button type="button" onClick={handleApplyCoupon} variant="outline" className="h-11 px-4 rounded-xl font-bold shrink-0">
                  <Ticket className="w-4 h-4 mr-1 text-blue-600" /> Apply
                </Button>
              </div>
            </div>

            {/* PAYMENT SOURCE DROPDOWN WITH FIRST CLASS UPI 1 AND UPI 2 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Source</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="Cash at Desk">Cash at Desk</option>
                <option value="UPI 1 / Online Transfer">UPI 1 / Online Transfer</option>
                <option value="UPI 2 / Online Transfer">UPI 2 / Online Transfer</option>
                <option value="Card Payment (POS)">Card Payment (POS)</option>
                <option value="Membership">Membership Card (Stored Balance)</option>
                <option value="Gift Card">Gift Voucher Code</option>
              </select>
            </div>

            {/* MEMBERSHIP SELECTION */}
            {paymentMethod === 'Membership' && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600" /> Client Active Memberships
                  </span>
                  <Badge variant="gold">{availableMemberships.length} Available</Badge>
                </div>
                {availableMemberships.length > 0 ? (
                  <select
                    value={selectedMembershipId}
                    onChange={(e) => setSelectedMembershipId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white border border-amber-300"
                  >
                    {availableMemberships.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.membershipName} ({m.membershipNumber}) — Active Bal: ₹{m.remainingBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">No active membership found for {customerPhone || 'this client'}.</p>
                )}
              </div>
            )}

            {/* PRICE SUMMARY (ZERO GST) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Treatment Base Rate:</span>
                <span className="font-mono font-bold">₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              {appliedDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Offer Discount:</span>
                  <span className="font-mono">-₹{appliedDiscountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Tax (GST):</span>
                <span>₹0 (GST Exempt)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Final Receivable Amount:</span>
                <span className="font-mono text-base text-blue-600 dark:text-blue-400">₹{finalPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-6">
                {isSubmitting ? 'Recording Booking...' : 'Confirm Appointment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
