'use client';

import { useState, useEffect } from 'react';
import { BookingItem, BookingStatus } from '@/features/bookings/types/booking.types';
import { bookingService } from '@/features/bookings/services/booking-service';
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
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  FileText,
  Trash2,
  Filter,
} from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<BookingItem | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

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

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.bookingStatus === statusFilter;
    const matchesLocation = locationFilter === 'all' || b.locationName.includes(locationFilter);

    return matchesSearch && matchesStatus && matchesLocation;
  });

  return (
    <PageShell
      title="Bookings & Reservations Engine"
      description="Receptionist & Front Desk portal: Schedule appointments, manage client rosters across Lucknow spa centers, and generate instant printable client booking slips."
    >
      <div className="space-y-6">
        {/* Actions & Filters Bar */}
        <Card className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Search by Booking Ref (BK-2026-8801), Client name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="w-full max-w-md text-xs"
              />
            </div>

            {/* Location & Status Filters + Create Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Location Filter */}
              <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium focus:outline-none text-foreground"
                >
                  <option value="all">All Lucknow Spa Centers</option>
                  <option value="Gomti Nagar">Gomti Nagar Flagship</option>
                  <option value="Hazratganj">Hazratganj Luxury</option>
                  <option value="Indira Nagar">Indira Nagar Spa</option>
                  <option value="Aliganj">Aliganj Wellness</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium focus:outline-none text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Service">In Service</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Booking & Slip
              </Button>
            </div>
          </div>
        </Card>

        {/* Bookings Data Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Code</TableHead>
                <TableHead>Client & Phone</TableHead>
                <TableHead>Treatment Service</TableHead>
                <TableHead>Date & Time</TableHead>
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
                    <p className="text-sm font-semibold">No bookings found</p>
                    <p className="text-xs">Click &quot;New Booking &amp; Slip&quot; to schedule your first appointment.</p>
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
                          <Calendar className="w-3 h-3 text-muted-foreground" /> {bk.appointmentDate}
                        </p>
                        <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Clock className="w-3 h-3" /> {bk.appointmentTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" /> {bk.locationName}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{bk.therapistName}</TableCell>
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
