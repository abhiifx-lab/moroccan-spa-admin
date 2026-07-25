'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

const mockInvoices = [
  { id: 'INV-2026-001', customer: 'Priya Sharma', total: '₹5,898.82', tax: '₹899.82 (18% GST)', status: 'Paid', date: '2026-07-24' },
  { id: 'INV-2026-002', customer: 'Taj Residency Lucknow Concierge', total: '₹45,000.00', tax: '₹6,864.40 (18% GST)', status: 'Issued', date: '2026-07-20' },
];

export default function InvoicesPage() {
  return (
    <PageShell
      title="Invoices & GST Tax Receipts"
      description="Generate formal invoices, GST tax receipts, and corporate billing statements in Indian Rupees (₹)."
      actionLabel="Create Invoice"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Bill To / Customer</TableHead>
              <TableHead>Total Amount (₹)</TableHead>
              <TableHead>Tax (GST 18%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInvoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono font-semibold text-amber-500">{inv.id}</TableCell>
                <TableCell className="font-medium text-foreground">{inv.customer}</TableCell>
                <TableCell><span className="font-bold text-foreground">{inv.total}</span></TableCell>
                <TableCell>{inv.tax}</TableCell>
                <TableCell><Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge></TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Download className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Printer className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
