'use client';

import { useRef } from 'react';
import { BookingItem } from '@/features/bookings/types/booking.types';
import { Button } from '@/components/ui/button';
import { Printer, Download, CheckCircle, MapPin, Phone, Calendar, Clock, User, Shield, X } from 'lucide-react';

interface BookingSlipModalProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingSlipModal({ booking, isOpen, onClose }: BookingSlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const gstTax = Math.round(booking.amount * 0.18);
  const netAmount = booking.amount - gstTax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-background border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">Official Client Booking Slip</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Slip Content */}
        <div className="p-6 overflow-y-auto space-y-6" ref={printRef}>
          {/* Slip Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-border">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 mb-1">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">MOROCCAN SPA</h2>
            <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">Authentic Hydrotherapy & Wellness</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-amber-500" /> {booking.locationName}, Lucknow
            </p>
            <p className="text-[10px] text-muted-foreground">Website: moroccanspa.in | Helpline: +91 522 400 1122</p>
          </div>

          {/* Ref & Date Badge */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Booking Reference</span>
              <p className="font-mono font-bold text-amber-500 text-sm">{booking.bookingRef}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Status</span>
              <p className="font-bold text-emerald-500">{booking.bookingStatus.toUpperCase()}</p>
            </div>
          </div>

          {/* Client Details */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] border-b border-border pb-1">
              Client & Appointment Details
            </h4>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-muted-foreground text-[11px] block">Client Name</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-500" /> {booking.customerName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Phone Contact</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-500" /> {booking.customerPhone}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Appointment Date</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500" /> {booking.appointmentDate}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Time Slot</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> {booking.appointmentTime} ({booking.serviceDuration})
                </span>
              </div>
            </div>
          </div>

          {/* Treatment & Therapist */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] border-b border-border pb-1">
              Selected Treatment & Staff
            </h4>
            <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 border border-border">
              <div className="flex justify-between font-bold text-foreground">
                <span>{booking.serviceName}</span>
                <span className="font-mono text-amber-500">₹{booking.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Assigned Therapist: <strong className="text-foreground">{booking.therapistName}</strong></span>
                <span>Mode: <strong>{booking.paymentMethod}</strong></span>
              </div>
              {booking.notes && (
                <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
                  Notes: &quot;{booking.notes}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Billing Breakup */}
          <div className="space-y-1.5 text-xs pt-2 border-t border-dashed border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Treatment Base Rate</span>
              <span className="font-mono">₹{netAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST Tax (18%)</span>
              <span className="font-mono">₹{gstTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
              <span>Total Amount Paid</span>
              <span className="font-mono text-amber-500 text-base">₹{booking.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-emerald-500 font-semibold pt-1">
              <span>Payment Status</span>
              <span>{booking.paymentStatus.toUpperCase()} ({booking.paymentMethod})</span>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="text-center text-[10px] text-muted-foreground space-y-1 pt-3 border-t border-border">
            <p>Please present this slip at reception 10 minutes before your appointment time.</p>
            <p className="font-mono">Thank you for visiting Moroccan Spa Lucknow!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-end gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Printer className="w-4 h-4 mr-1.5" /> Print Client Slip
          </Button>
        </div>
      </div>
    </div>
  );
}
