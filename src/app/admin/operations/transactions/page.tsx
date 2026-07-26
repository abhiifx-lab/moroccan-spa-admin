'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { operationsEngine, OperationTransaction } from '@/features/operations/services/operations-engine';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, DollarSign, Filter, FileText } from 'lucide-react';

export default function TransactionsPage() {
  const { activeCentreFilter } = useCentreContext();
  const [transactions, setTransactions] = useState<OperationTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [totalGross, setTotalGross] = useState(0);

  const loadTransactions = async () => {
    await operationsEngine.fetchTransactions();
    const allTx = operationsEngine.getTransactions(activeCentreFilter);
    setTransactions(allTx);

    const gross = allTx
      .filter((t) => ['booking', 'membership', 'gift_card', 'package'].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    setTotalGross(gross);
  };

  useEffect(() => {
    loadTransactions();
  }, [activeCentreFilter]);

  const filteredTransactions = transactions.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.refCode && s.refCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.remarks.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalGst = Math.round(totalGross * 0.18);

  const paymentLabel = (method: string) => {
    if (method === 'cash' || method === 'Cash at Desk') return 'Cash at Desk';
    if (method === 'card' || method === 'Card Payment (POS)') return 'Credit / POS Card';
    if (method === 'upi' || method === 'UPI / Online Transfer') return 'UPI / Online';
    if (method === 'Membership') return 'Membership Redemption';
    if (method === 'Gift Card') return 'Gift Voucher Redemption';
    return method;
  };

  const typeBadge = (type: string) => {
    if (type === 'booking') return <Badge variant="blue">Service Sale</Badge>;
    if (type === 'membership') return <Badge variant="gold">Membership Sale</Badge>;
    if (type === 'gift_card') return <Badge variant="emerald">Gift Voucher</Badge>;
    if (type === 'package') return <Badge variant="secondary">Package Sale</Badge>;
    if (type === 'expense') return <Badge variant="destructive">Expense</Badge>;
    return <Badge variant="outline">{type}</Badge>;
  };

  return (
    <PageShell
      title="Master Financial Activity & Transactions Register"
      description="Consolidated financial register tracking all service sales, membership purchases, gift voucher issuances, package sales, refunds, and payments."
    >
      <div className="space-y-6">
        {/* Metric Cards Surface */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Gross Sales Revenue</div>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              ₹{totalGross.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Derived live from Operations Engine (SSOT)
            </div>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Total Financial Entries</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {transactions.length} Activity Logs
            </div>
            <div className="text-[11px] text-slate-500">All financial events</div>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Total 18% GST Component</div>
            <div className="text-3xl font-extrabold text-purple-600 font-mono">
              ₹{totalGst.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500">GST Output Tax Ledger</div>
          </Card>
        </div>

        {/* Filter & Search Surface */}
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Input
                placeholder="Search by Transaction Ref, Booking Code, or Client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="max-w-md text-xs font-medium"
              />
              <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground"
                >
                  <option value="all">All Activity Types</option>
                  <option value="booking">Service Sales</option>
                  <option value="membership">Membership Sales</option>
                  <option value="gift_card">Gift Vouchers</option>
                  <option value="package">Package Sales</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredTransactions.length} recorded entries
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Ref</TableHead>
                <TableHead>Booking Code</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Gross Amount (₹)</TableHead>
                <TableHead className="text-right">GST (18%)</TableHead>
                <TableHead>Date &amp; Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-semibold">No transactions found</p>
                    <p className="text-xs">Financial transactions will stream live as bookings or memberships are processed.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-4">{s.id}</TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400 py-4">{s.refCode || '—'}</TableCell>
                    <TableCell className="py-4 font-bold text-slate-900 dark:text-white">
                      {s.customerName || 'Walk-in Client'}
                    </TableCell>
                    <TableCell className="py-4">
                      {typeBadge(s.type)}
                    </TableCell>
                    <TableCell className="py-4 font-medium text-slate-700 dark:text-slate-300">
                      {paymentLabel(s.paymentMethod)}
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
