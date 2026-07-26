'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useAuth } from '@/hooks/use-auth';
import { cashFlowService, CashFlowRecord, CashMovementType } from '@/features/cash-flow/services/cash-flow-service';
import { domainQueryLayer } from '@/features/domain-queries/domain-query-layer';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet,
  Building2,
  Calendar,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES_CASH_IN: CashFlowRecord['category'][] = [
  'Owner Capital Added',
  'Cash Received',
  'Cash Transfer In',
  'Opening Cash / Float Top-up',
  'Petty Cash Added',
  'Bank Withdrawal',
  'Other Movement',
];

const CATEGORIES_CASH_OUT: CashFlowRecord['category'][] = [
  'Owner Cash Withdrawal',
  'Cash Transfer Out',
  'Bank Cash Deposit',
  'Petty Cash Removed',
  'Refund Paid in Cash',
  'Other Movement',
];

import { FinancialDrillDownModal } from '@/components/admin/accounting/drill-down-modal';
import { operationsEngine, OperationTransaction } from '@/features/operations/services/operations-engine';

export default function CashRegisterPage() {
  const { activeCentreFilter, isSuperAdmin, centres } = useCentreContext();
  const { user } = useAuth();

  const [records, setRecords] = useState<CashFlowRecord[]>([]);
  const [summary, setSummary] = useState({
    runningCashBalance: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    netCashMovement: 0,
    recordCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CashMovementType>('all');

  // Drill-Down Modal State
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownAmount, setDrillDownAmount] = useState(0);
  const [drillDownTxns, setDrillDownTxns] = useState<OperationTransaction[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<CashMovementType>('Cash In');
  const [selectedCentreId, setSelectedCentreId] = useState<string>(activeCentreFilter || 'loc_pallasio');
  const [category, setCategory] = useState<CashFlowRecord['category']>('Opening Cash / Float Top-up');
  const [amount, setAmount] = useState<number>(5000);
  const [reason, setReason] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const list = await cashFlowService.getRecords(activeCentreFilter);
    const sum = await cashFlowService.getCashRegisterSummary(activeCentreFilter);
    setRecords(list);
    setSummary(sum);
  };

  useEffect(() => {
    loadData();
    if (activeCentreFilter && activeCentreFilter !== 'all') {
      setSelectedCentreId(activeCentreFilter);
    }
  }, [activeCentreFilter]);

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || amount <= 0) {
      toast.error('Please enter a valid reason and amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenCentre = centres.find((c) => c.id === selectedCentreId) || {
        id: selectedCentreId,
        name: selectedCentreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : selectedCentreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
      };

      await cashFlowService.addRecord({
        date: new Date().toISOString().split('T')[0],
        centreId: chosenCentre.id,
        centreName: chosenCentre.name,
        type: movementType,
        category,
        amount: Number(amount),
        reason,
        referenceCode: referenceCode || undefined,
        remarks: remarks || undefined,
        createdBy: user?.email || 'admin@moroccanspa.in',
      });

      toast.success(`${movementType} entry of ₹${amount.toLocaleString('en-IN')} recorded in Cash Register!`);
      setIsModalOpen(false);
      setReason('');
      setReferenceCode('');
      setRemarks('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record cash movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCashDrillDown = async (title: string, filterType: 'all' | 'in' | 'out', amt: number) => {
    const lineage = await domainQueryLayer.getCurrentCashWithLineage(activeCentreFilter);
    let matchedOps = lineage.journalEntries;

    if (filterType === 'in') {
      matchedOps = lineage.journalEntries.filter((t) => t.type !== 'expense' && t.type !== 'cash_out');
    } else if (filterType === 'out') {
      matchedOps = lineage.journalEntries.filter((t) => t.type === 'expense' || t.type === 'cash_out');
    }

    setDrillDownTitle(title);
    setDrillDownAmount(lineage.currentCash);
    setDrillDownTxns(matchedOps);
    setDrillDownModalOpen(true);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.centreName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referenceCode && r.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <PageShell
      title="Operational Cash Register & Cash Book"
      description="Single Source of Truth for physical drawer cash inside each spa centre. Tracks running cash balance, cash inflows, and cash outflows. Feeds daily closing, accounting, and dashboard cash metrics automatically."
    >
      <div className="space-y-6">
        {/* Main Running Cash Register Balance Surface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card onClick={() => handleOpenCashDrillDown('Running Physical Cash in Hand', 'all', summary.runningCashBalance)} className="lg:col-span-2 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[24px] shadow-2xl border-none space-y-4 cursor-pointer hover:scale-[1.01] transition-transform">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-blue-200">
                  Business Cash Register (SSOT) • Click to Drill Down
                </span>
                <h2 className="text-3xl font-extrabold font-mono mt-1">
                  ₹{summary.runningCashBalance.toLocaleString('en-IN')}
                </h2>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white shrink-0">
                <Wallet className="w-7 h-7" />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-100">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-300" /> Continuous Drawer Balance
              </span>
              <span className="font-mono text-[11px]">Updated in Real Time</span>
            </div>
          </Card>

          <Card onClick={() => handleOpenCashDrillDown('Total Cash In (+)', 'in', summary.totalCashIn)} className="p-5 bg-white dark:bg-[#141c2e] shadow-surface rounded-[24px] border-none flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cash In (+)</p>
                <h3 className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  +₹{summary.totalCashIn.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Click for Cash Sales &amp; Top-ups</p>
          </Card>

          <Card onClick={() => handleOpenCashDrillDown('Total Cash Out (-)', 'out', summary.totalCashOut)} className="p-5 bg-white dark:bg-[#141c2e] shadow-surface rounded-[24px] border-none flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cash Out (-)</p>
                <h3 className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  -₹{summary.totalCashOut.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Click for Cash Expenses &amp; Deposits</p>
          </Card>
        </div>

        {/* Filter & Action Controls Bar */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Input
                placeholder="Search by reason, category, ref code, or centre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="max-w-md text-xs font-medium"
              />
              <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-md px-2 py-1 text-xs">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground"
                >
                  <option value="all">All Register Entries</option>
                  <option value="Cash In">Cash In Only (+)</option>
                  <option value="Cash Out">Cash Out Only (-)</option>
                </select>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-surface text-xs h-10 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Record Cash Register Movement
            </Button>
          </div>
        </Card>

        {/* Data Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Spa Centre</TableHead>
                <TableHead className="text-right">Transaction Amount (₹)</TableHead>
                <TableHead className="text-right">Running Register Balance (₹)</TableHead>
                <TableHead>Reason &amp; Reference Code</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold">No Cash Register movements recorded</p>
                    <p className="text-xs">Click &quot;Record Cash Register Movement&quot; to log physical cash drawer entries.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                      {r.date}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.type === 'Cash In' ? 'success' : 'destructive'} className="font-bold flex items-center w-fit gap-1">
                        {r.type === 'Cash In' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                      {r.category}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      {r.centreName}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-extrabold ${r.type === 'Cash In' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {r.type === 'Cash In' ? '+' : '-'}₹{r.amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-right font-extrabold text-blue-600 dark:text-blue-400">
                      ₹{r.runningBalanceAfter.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-xs">{r.reason}</p>
                        {r.referenceCode && (
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {r.referenceCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {r.createdBy}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Record Cash Register Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Record Cash Register Movement</h3>
                <p className="text-xs text-slate-500 font-medium">Physical drawer cash movement entry for selected outlet.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-4 text-xs font-medium">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMovementType('Cash In');
                    setCategory(CATEGORIES_CASH_IN[0]);
                  }}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    movementType === 'Cash In' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Cash In (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementType('Cash Out');
                    setCategory(CATEGORIES_CASH_OUT[0]);
                  }}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    movementType === 'Cash Out' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Cash Out (-)
                </button>
              </div>

              {/* Outlet & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">Spa Centre</label>
                  <select
                    value={selectedCentreId}
                    onChange={(e) => setSelectedCentreId(e.target.value)}
                    disabled={!isSuperAdmin}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">Movement Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {(movementType === 'Cash In' ? CATEGORIES_CASH_IN : CATEGORIES_CASH_OUT).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount & Reference Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">Amount (₹)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="h-10 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">Reference Code (Optional)</label>
                  <Input
                    placeholder="e.g. TRF-8812 / DEP-991"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="h-10 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">Reason / Purpose</label>
                <Input
                  placeholder="e.g. Morning reception cash float top-up"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 text-xs font-semibold"
                  required
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">Remarks / Operational Note</label>
                <textarea
                  placeholder="Additional details for audit log &amp; cash book..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-[#f6f8fb] dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white outline-none resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5">
                  Save Cash Movement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Financial Lineage Drill-Down Modal */}
      <FinancialDrillDownModal
        isOpen={drillDownModalOpen}
        onClose={() => setDrillDownModalOpen(false)}
        title={drillDownTitle}
        totalAmount={drillDownAmount}
        transactions={drillDownTxns}
      />
    </PageShell>
  );
}
