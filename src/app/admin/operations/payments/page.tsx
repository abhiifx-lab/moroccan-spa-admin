'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { operationsEngine, OperationTransaction } from '@/features/operations/services/operations-engine';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp } from 'lucide-react';

export default function PaymentsPage() {
  const { activeCentreFilter } = useCentreContext();
  const [sales, setSales] = useState<OperationTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);

  const loadSales = () => {
    // SINGLE SOURCE OF TRUTH: All revenue transactions from Operations Engine
    const allTx = operationsEngine.getTransactions(activeCentreFilter);
    const revenueTx = allTx.filter((t) => ['booking', 'membership', 'gift_card', 'package'].includes(t.type));
    setSales(revenueTx);

    const total = revenueTx.reduce((sum, t) => sum + t.amount, 0);
    setTotalRevenue(total);
  };

  useEffect(() => {
    loadSales();
  }, [activeCentreFilter]);

  const filteredSales = sales.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.refCode && s.refCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.remarks.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGst = Math.round(totalRevenue * 0.18);

  const paymentLabel = (method: string) => {
    if (method === 'cash') return 'Cash at Desk';
    if (method === 'card') return 'Credit / Debit Card';
    return 'UPI / Razorpay';
  };

  const typeLabel = (type: string) => {
    if (type === 'booking') return 'Service Sale';
    if (type === 'membership') return 'Membership';
    if (type === 'gift_card') return 'Gift Card';
    if (type === 'package') return 'Package';
    return type;
  };

  return (
    <PageShell
      title="Sales Ledger & Payment Transactions"
      description="Real-time financial transactions, appointment sales logs, UPI/Cash receipts derived live from the Operations Engine (Single Source of Truth)."
    >
      <div className="space-y-6">
        {/* Metric Cards Surface */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Total Sales Revenue</div>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Derived live from Operations Engine (SSOT)
            </div>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Total Sales Transactions</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {sales.length} Receipts
            </div>
            <div className="text-[11px] text-slate-500">Live customer transactions</div>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Total 18% GST Collected</div>
            <div className="text-3xl font-extrabold text-purple-600 font-mono">
              ₹{totalGst.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500">GST Tax Ledger</div>
          </Card>
        </div>

        {/* Filter & Search Surface */}
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <Input
                placeholder="Search by Transaction ID, Booking Ref, or Client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-xs rounded-xl bg-[#f6f8fb] dark:bg-slate-800/80 border-none focus-glow"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredSales.length} recorded sales
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Ref</TableHead>
                <TableHead>Booking Code</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Gross Sale (₹)</TableHead>
                <TableHead className="text-right">GST (18%)</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400 font-medium">
                    No sales transactions recorded yet. Create a booking to see it stream live here!
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-4">{s.id}</TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400 py-4">{s.refCode || '—'}</TableCell>
                    <TableCell className="py-4 font-bold text-slate-900 dark:text-white">
                      {s.customerName || 'Walk-in Client'}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline">{typeLabel(s.type)}</Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline">{paymentLabel(s.paymentMethod)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono font-extrabold text-right text-slate-900 dark:text-white py-4">
                      ₹{s.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="font-mono text-right text-slate-500 py-4">
                      ₹{Math.round(s.amount * 0.18).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="font-mono text-slate-400 py-4 text-[11px]">
                      {s.date} {s.time}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageShell>
  );
}
