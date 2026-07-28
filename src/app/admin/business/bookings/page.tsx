'use client';

import { useState, useEffect } from 'react';
import { BookingItem, BookingStatus } from '@/features/bookings/types/booking.types';
import { bookingService } from '@/features/bookings/services/booking-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { CreateBookingModal } from '@/components/admin/bookings/create-booking-modal';
import { BookingSlipModal } from '@/components/admin/bookings/booking-slip-modal';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Printer,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
  Trash2,
  Filter,
  User,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const OFFICIAL_LOCATIONS = [
  { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio' },
  { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn' },
  { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall' },
];

export default function TodaysBookingsPage() {
  const { isSuperAdmin, activeCentreFilter, centres, filterRecordsByCentre } = useCentreContext();

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Date Filter Controls (Default: 'Today')
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'tomorrow' | 'specific' | 'range' | 'all'>('today');
  const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Advanced Attribute Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>(activeCentreFilter || 'all');
  const [therapistFilter, setTherapistFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<BookingItem | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Sync Location Lock for Centre Admins
  useEffect(() => {
    if (!isSuperAdmin && activeCentreFilter) {
      setLocationFilter(activeCentreFilter);
    }
  }, [isSuperAdmin, activeCentreFilter]);

  const loadBookings = async () => {
    const data = await bookingService.getBookings();
    setBookings(data);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleBookingCreated = (newBooking: BookingItem) => {
    loadBookings();
    setSelectedBookingForSlip(newBooking);
    setIsSlipModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: BookingStatus) => {
    await bookingService.updateBookingStatus(id, newStatus);
    loadBookings();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to cancel and remove this booking?')) {
      await bookingService.deleteBooking(id);
      loadBookings();
    }
  };

  // Helper for timezone-safe local YYYY-MM-DD date calculation
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowDate);

  // Enforce Multi-Centre Scoping & Advanced Filters
  const centreScopedBookings = filterRecordsByCentre(bookings);

  const filteredBookings = centreScopedBookings.filter((b) => {
    // 1. Search Query Filter
    const matchesSearch =
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Date Filter Logic
    let matchesDate = true;
    if (dateFilterType === 'today') {
      matchesDate = b.appointmentDate === todayStr;
    } else if (dateFilterType === 'yesterday') {
      matchesDate = b.appointmentDate === yesterdayStr;
    } else if (dateFilterType === 'tomorrow') {
      matchesDate = b.appointmentDate === tomorrowStr;
    } else if (dateFilterType === 'specific') {
      matchesDate = b.appointmentDate === specificDate;
    } else if (dateFilterType === 'range') {
      matchesDate = b.appointmentDate >= startDate && b.appointmentDate <= endDate;
    }

    // 3. Status Filters
    const matchesStatus = statusFilter === 'all' || b.bookingStatus === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || b.paymentStatus === paymentStatusFilter;

    // 4. Therapist & Service Filters
    const matchesTherapist = therapistFilter === 'all' || b.therapistName === therapistFilter;
    const matchesService = serviceFilter === 'all' || b.serviceName.toLowerCase().includes(serviceFilter.toLowerCase());

    // 5. Location Scoping Filter
    const matchesLocation =
      !isSuperAdmin
        ? true
        : locationFilter === 'all'
        ? true
        : b.locationId === locationFilter || b.locationName.includes(locationFilter);

    return matchesSearch && matchesDate && matchesStatus && matchesPaymentStatus && matchesTherapist && matchesService && matchesLocation;
  });

  const availableOutlets = centres.length > 0 ? centres : OFFICIAL_LOCATIONS;
  const uniqueTherapists = Array.from(new Set(bookings.map((b) => b.therapistName).filter(Boolean)));
  const uniqueServices = Array.from(new Set(bookings.map((b) => b.serviceName).filter(Boolean)));

  return (
    <PageShell
      title="Today's Bookings & Roster Engine"
      description="Receptionist & Front Desk portal: Schedule appointments, manage client rosters across Lucknow spa centers, and generate instant printable client booking slips."
    >
      <div className="space-y-6">
        {/* Actions & Filters Bar */}
        <Card className="space-y-4">
          {/* Top Row: Date Presets & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-4">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Search by Booking Ref (BK-2026-8801), Client name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="w-full max-w-md text-xs font-medium"
              />
            </div>

            {/* Date Preset Selector Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
              <button
                onClick={() => setDateFilterType('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilterType('yesterday')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'yesterday' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilterType('tomorrow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'tomorrow' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setDateFilterType('specific')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'specific' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Specific Date
              </button>
              <button
                onClick={() => setDateFilterType('range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'range' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Date Range
              </button>
              <button
                onClick={() => setDateFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilterType === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Sub-Row: Custom Date Input Selectors (if specific or range selected) */}
          {(dateFilterType === 'specific' || dateFilterType === 'range') && (
            <div className="flex items-center gap-3 py-1 text-xs">
              {dateFilterType === 'specific' && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-foreground">Date:</label>
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="h-9 w-40 text-xs font-bold"
                  />
                </div>
              )}

              {dateFilterType === 'range' && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-foreground">From:</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 w-36 text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-foreground">To:</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-36 text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Row: Advanced Filter Dropdowns & Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Location Filter (Locked for Centre Admins) */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {isSuperAdmin && <option value="all">All Lucknow Outlets</option>}
                  {(isSuperAdmin
                    ? availableOutlets
                    : availableOutlets.filter((loc) => loc.id === activeCentreFilter || loc.id === locationFilter)
                  ).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                {!isSuperAdmin && (
                  <Badge variant="emerald" className="text-[9px] uppercase px-1.5 py-0 font-extrabold ml-1">
                    Locked
                  </Badge>
                )}
              </div>

              {/* Therapist Filter */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <select
                  value={therapistFilter}
                  onChange={(e) => setTherapistFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground"
                >
                  <option value="all">All Therapists</option>
                  {uniqueTherapists.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Booking Status Filter */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Service">In Service</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-xs">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Unpaid">Unpaid Only</option>
                </select>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-surface text-xs h-10 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Booking &amp; Slip
            </Button>
          </div>
        </Card>

        {/* Bookings Data Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Code</TableHead>
                <TableHead>Client &amp; Phone</TableHead>
                <TableHead>Treatment Service</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Spa Center</TableHead>
                <TableHead>Therapist</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions / Receipt Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold">No bookings found for selected criteria</p>
                    <p className="text-xs">Click &quot;New Booking &amp; Slip&quot; to schedule your first appointment for this roster.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((bk) => (
                  <TableRow key={bk.id}>
                    <TableCell className="font-mono font-bold text-amber-500 text-xs">
                      {bk.bookingRef}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{bk.customerName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{bk.customerPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-xs">{bk.serviceName}</p>
                        <p className="text-[11px] text-muted-foreground">{bk.serviceDuration}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-medium text-foreground">
                          <CalendarIcon className="w-3 h-3 text-muted-foreground" /> {bk.appointmentDate}
                        </p>
                        <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Clock className="w-3 h-3" /> {bk.appointmentTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" /> {bk.locationName}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{bk.therapistName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-foreground text-xs font-mono">
                          ₹{bk.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-emerald-500 font-semibold">{bk.paymentMethod}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={bk.bookingStatus}
                        onChange={(e) => handleStatusChange(bk.id, e.target.value as BookingStatus)}
                        className={`text-xs font-semibold rounded-md border border-border px-2 py-1 bg-background focus:outline-none ${
                          bk.bookingStatus === 'Confirmed'
                            ? 'text-emerald-500 border-emerald-500/30'
                            : bk.bookingStatus === 'In Service'
                            ? 'text-amber-500 border-amber-500/30'
                            : bk.bookingStatus === 'Completed'
                            ? 'text-blue-500 border-blue-500/30'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="In Service">In Service</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                          onClick={() => {
                            setSelectedBookingForSlip(bk);
                            setIsSlipModalOpen(true);
                          }}
                          title="Print Client Booking Slip"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Slip
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(bk.id)}
                          title="Cancel Booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBookingCreated={handleBookingCreated}
      />

      {/* Printable Booking Slip Modal */}
      <BookingSlipModal
        booking={selectedBookingForSlip}
        isOpen={isSlipModalOpen}
        onClose={() => {
          setIsSlipModalOpen(false);
          setSelectedBookingForSlip(null);
        }}
      />
    </PageShell>
  );
}
