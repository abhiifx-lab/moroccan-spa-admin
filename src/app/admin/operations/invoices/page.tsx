'use client';

import { useState, useEffect } from 'react';
import { BookingItem } from '@/features/bookings/types/booking.types';
import { bookingService } from '@/features/bookings/services/booking-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookingSlipModal } from '@/components/admin/bookings/booking-slip-modal';
import { Download, Printer, Search, FileText } from 'lucide-react';

export default function InvoicesPage() {
  const { filterRecordsByCentre } = useCentreContext();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
      const data = await bookingService.getBookings();
      setBookings(data);
    }
    loadInvoices();
  }, []);

  const centreScopedInvoices = filterRecordsByCentre(bookings);
  const filteredInvoices = centreScopedInvoices.filter(
    (b) =>
      b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery)
  );

  const handleOpenSlip = (b: BookingItem) => {
    setSelectedBooking(b);
    setIsModalOpen(true);
  };

  return (
    <PageShell
      title="Client Invoices & Billing Ledger"
      description="View, print, and download formal receipts and billing statements linked to client appointment records."
    >
      <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <Input
            placeholder="Search invoice by Ref (BK-2026-...), Client name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="max-w-md text-xs font-medium"
          />
          <Badge variant="blue">{filteredInvoices.length} Invoices Found</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Ref #</TableHead>
                <TableHead>Bill To Client</TableHead>
                <TableHead>Spa Outlet</TableHead>
                <TableHead>Total Receivable (₹)</TableHead>
                <TableHead>Tax (GST)</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400 font-medium">
                    No billing invoices match active search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs py-3.5">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        {inv.bookingRef}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-3.5">
                      <div>{inv.customerName}</div>
                      <div className="font-mono text-[10px] text-slate-400 font-normal">{inv.customerPhone}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 py-3.5 whitespace-nowrap">
                      {inv.locationName}
                    </TableCell>
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-3.5 whitespace-nowrap">
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 py-3.5 whitespace-nowrap">₹0 (Exempt)</TableCell>
                    <TableCell className="py-3.5 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs font-bold">
                        {inv.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-3.5 whitespace-nowrap">
                      {inv.appointmentDate}
                    </TableCell>
                    <TableCell className="text-right py-3.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenSlip(inv)}
                        className="h-8 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" /> View Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <BookingSlipModal booking={selectedBooking} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </PageShell>
  );
}
