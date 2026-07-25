'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { revalidateOperationalViews } from '@/app/actions/operations';
import { accountingEngine } from '@/features/accounting/services/accounting-engine';
import { operationsEngine } from '@/features/operations/services/operations-engine';
import { GeneralLedgerEntry, CashBookEntry } from '@/features/accounting/types/general-ledger.types';
import { CHART_OF_ACCOUNTS } from '@/features/accounting/types/chart-of-accounts.types';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useAuth } from '@/hooks/use-auth';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  FileSpreadsheet,
  Calendar,
  Clock,
  Lock,
  Unlock,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Building2,
  TrendingUp,
  X,
  Grid,
  ShieldCheck,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ListFilter,
} from 'lucide-react';

const FALLBACK_CENTRE = { id: 'loc_1', name: 'Moroccan Spa Gomti Nagar Flagship' };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AccountingEnginePage() {
  const { activeCentreFilter, isSuperAdmin, assignedCentre, centres } = useCentreContext();
  const { user } = useAuth();

  // Selected Scope Controls
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(6); // 0-indexed (6 = July)
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'cashbook' | 'journal' | 'chart_of_accounts'>('monthly');

  // Live Calculated Accounting States
  const [liveRegister, setLiveRegister] = useState<ReturnType<typeof operationsEngine.getDailyRegister> | null>(null);
  const [monthlyRegisterData, setMonthlyRegisterData] = useState<ReturnType<typeof operationsEngine.getMonthlyRegister> | null>(null);
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [glTransactions, setGlTransactions] = useState<GeneralLedgerEntry[]>([]);

  // Closure Reconciliation State
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [mismatchReason, setMismatchReason] = useState<string>('');
  const [closureRemarks, setClosureRemarks] = useState<string>('');

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Reversal Modal State
  const [selectedTxnForReversal, setSelectedTxnForReversal] = useState<GeneralLedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const currentCentreObj =
    activeCentreFilter === 'all'
      ? { id: 'all', name: 'Consolidated Overview (All Spa Centres)' }
      : (centres && centres.find((c) => c.id === activeCentreFilter)) || assignedCentre || centres[0] || FALLBACK_CENTRE;

  const yearMonthStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  // Loaders
  const loadData = () => {
    if (!currentCentreObj) return;

    // 1. Live Daily Register (from Operations Engine SSOT)
    const reg = operationsEngine.getDailyRegister(currentCentreObj.id, selectedDate);
    setLiveRegister(reg);
    setActualCashCounted(reg.actualCashCounted);
    setMismatchReason(reg.mismatchReason || '');
    setClosureRemarks(reg.remarks || '');

    // 2. Excel Monthly Register (from Operations Engine SSOT)
    const monthly = operationsEngine.getMonthlyRegister(currentCentreObj.id, yearMonthStr);
    setMonthlyRegisterData(monthly);

    // 3. Cash Book (from Operations Engine SSOT)
    const cb = operationsEngine.getCashBook(currentCentreObj.id, selectedDate);
    setCashBookEntries(cb as CashBookEntry[]);

    // 4. GL Journal (kept from accounting engine for audit trail)
    const gl = accountingEngine.getGLTransactions(currentCentreObj.id);
    setGlTransactions(gl);
  };

  useEffect(() => {
    loadData();
  }, [activeCentreFilter, selectedDate, selectedYear, selectedMonthIndex]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  // Export Handlers
  const handleExportCSV = () => {
    if (!monthlyRegisterData) return;
    const headers = [
      'Date', 'Opening Cash', 'Cash Sales', 'Card Sales', 'UPI Sales',
      'Mem. Cash', 'Mem. Card', 'Mem. UPI', 'Gift Card Sales', 'Package Sales',
      'Customer Advances', 'Expenses', 'Salary Paid', 'Staff Advance', 'Cash Handover',
      'Bank Deposit', 'Refunds', 'Expected Cash', 'Actual Cash', 'Difference', 'Closing Cash', 'Remarks', 'Status'
    ];

    const rowsStr = monthlyRegisterData.rows.map((r) => [
      r.date, r.openingCash, r.cashSales, r.cardSales, r.upiSales,
      r.membershipCash, r.membershipCard, r.membershipUpi, r.giftCardSales, r.packageSales,
      r.customerAdvances, r.expenses, r.salaryPayments, r.staffAdvances, r.vaultHandover,
      r.bankDeposits, r.refunds, r.expectedClosingCash, r.actualCashCounted, r.difference, r.actualCashCounted, `"${r.remarks}"`, r.isLocked ? 'LOCKED' : 'OPEN'
    ].join(','));

    const csvContent = [headers.join(','), ...rowsStr].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Register_${MONTH_NAMES[selectedMonthIndex]}_${selectedYear}_${currentCentreObj.id}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Lock Day Action
  const handleLockDay = async () => {
    if (!liveRegister) return;
    const diff = actualCashCounted - liveRegister.expectedClosingCash;
    if (diff !== 0 && !mismatchReason.trim()) {
      toast.error('Mandatory mismatch reason required when actual cash differs from expected cash!');
      return;
    }

    try {
      await operationsEngine.lockDay({
        centreId: currentCentreObj.id,
        date: selectedDate,
        actualCashCounted: Number(actualCashCounted),
        mismatchReason,
        remarks: closureRemarks,
        closedBy: user?.fullName || 'reception@moroccanspa.in',
      });
      // Also sync lock to accounting engine for audit trail
      try {
        await accountingEngine.lockDay({
          centreId: currentCentreObj.id,
          date: selectedDate,
          actualCashCounted: Number(actualCashCounted),
          mismatchReason,
          remarks: closureRemarks,
          closedBy: user?.fullName || 'reception@moroccanspa.in',
        });
      } catch { /* non-critical */ }
      
      await revalidateOperationalViews();
      toast.success('Daily Register Locked & Reconciled! Opening cash for tomorrow is set.');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lock day failed.');
    }
  };

  // Reopen Day Action (Super Admin / Manager)
  const handleReopenDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      alert('Mandatory reason required to reopen a closed day!');
      return;
    }

    try {
      await accountingEngine.reopenDay(
        currentCentreObj.id,
        selectedDate,
        reopenReason,
        user?.fullName || 'superadmin@moroccanspa.in'
      );
      alert('✓ Day unlocked successfully by Finance! Audit log recorded.');
      setIsReopenModalOpen(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reopen failed.');
    }
  };

  // Reversal Entry Action
  const handleReverseTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxnForReversal || !reversalReason.trim()) {
      alert('Mandatory reason required to reverse a transaction!');
      return;
    }

    try {
      await accountingEngine.reverseTransaction(
        selectedTxnForReversal.transactionId,
        reversalReason,
        user?.fullName || 'finance@moroccanspa.in'
      );
      alert(`✓ Transaction ${selectedTxnForReversal.transactionId} reversed! Counter-entry posted.`);
      setSelectedTxnForReversal(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reversal failed.');
    }
  };

  return (
    <PageShell
      title="Accounting Engine & Register System"
      description="Enterprise ERP accounting engine. Automated Excel-style Monthly Register (1-31 days), Cash Book stream, and double-entry General Ledger."
    >
      <div className="space-y-8">
        {/* Header Surface & Tab Switcher */}
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  {currentCentreObj.name}
                </h3>
                <Badge variant="blue">ERP Double-Entry Engine</Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Digital replacement of physical Excel ledgers auto-fed by transactions.
              </p>
            </div>
          </div>

          {/* ERP Accounting Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#f6f8fb] dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-blue-600 text-white shadow-surface'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Register (Excel View)
            </button>

            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'daily'
                  ? 'bg-blue-600 text-white shadow-surface'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Register (Master Sheet)
            </button>

            <button
              onClick={() => setActiveTab('cashbook')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cashbook'
                  ? 'bg-blue-600 text-white shadow-surface'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cash Book Stream
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'journal'
                  ? 'bg-blue-600 text-white shadow-surface'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              GL Journal
            </button>

            <button
              onClick={() => setActiveTab('chart_of_accounts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chart_of_accounts'
                  ? 'bg-blue-600 text-white shadow-surface'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chart of Accounts
            </button>
          </div>
        </Card>

        {/* TAB 1: EXCEL-STYLE MONTHLY REGISTER (MASTER SPREADSHEET) */}
        {activeTab === 'monthly' && monthlyRegisterData && (
          <div className="space-y-6">
            {/* Month & Year Selector + Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f6f8fb] dark:bg-slate-800/50 p-4 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-xs">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-extrabold text-slate-900 dark:text-white text-xs">
                    {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-slate-500">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus-glow"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="rounded-xl text-xs h-9 bg-white dark:bg-slate-800 shadow-xs border-none">
                  <Download className="w-4 h-4 mr-1.5" /> Export Excel (.csv)
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrintPDF} className="rounded-xl text-xs h-9 bg-white dark:bg-slate-800 shadow-xs border-none">
                  <Printer className="w-4 h-4 mr-1.5" /> Print PDF
                </Button>
              </div>
            </div>

            {/* True Excel Spreadsheet Table */}
            <Card className="p-0 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
                <table className="w-full text-xs border-collapse min-w-[2400px]">
                  {/* Sticky Header */}
                  <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider shadow-xs">
                    <tr>
                      <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 p-3 text-left w-28 border-r border-slate-200 dark:border-slate-700">Date</th>
                      <th className="p-3 text-right">Opening Cash</th>
                      <th className="p-3 text-right text-blue-600 dark:text-blue-400">Cash Sales</th>
                      <th className="p-3 text-right">Card Sales</th>
                      <th className="p-3 text-right">UPI Sales</th>
                      <th className="p-3 text-right">Mem. Cash</th>
                      <th className="p-3 text-right">Mem. Card</th>
                      <th className="p-3 text-right">Mem. UPI</th>
                      <th className="p-3 text-right">Gift Cards</th>
                      <th className="p-3 text-right">Packages</th>
                      <th className="p-3 text-right text-red-500">Expenses</th>
                      <th className="p-3 text-right">Salary</th>
                      <th className="p-3 text-right">Staff Advance</th>
                      <th className="p-3 text-right">Handover</th>
                      <th className="p-3 text-right">Bank Deposit</th>
                      <th className="p-3 text-right">Refunds</th>
                      <th className="p-3 text-right font-extrabold text-slate-900 dark:text-white">Expected Cash</th>
                      <th className="p-3 text-right font-extrabold text-emerald-600">Actual Cash</th>
                      <th className="p-3 text-right">Diff</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>

                  {/* 1 to 31 Calendar Days Rows */}
                  <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/70 font-mono text-[11px]">
                    {monthlyRegisterData.rows.map((row, idx) => (
                      <tr
                        key={row.date}
                        onClick={() => {
                          setSelectedDate(row.date);
                          setActiveTab('daily');
                        }}
                        className={`cursor-pointer transition-colors ${
                          idx % 2 === 0 ? 'bg-white dark:bg-[#141c2e]' : 'bg-slate-50/50 dark:bg-slate-800/30'
                        } hover:bg-blue-50/60 dark:hover:bg-blue-950/40`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit p-3 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                          {row.date}
                        </td>
                        <td className="p-3 text-right text-slate-500">₹{row.openingCash.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">₹{row.cashSales.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.cardSales.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.upiSales.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.membershipCash.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.membershipCard.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.membershipUpi.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.giftCardSales.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.packageSales.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-red-500 font-bold">₹{row.expenses.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.salaryPayments.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.staffAdvances.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.vaultHandover.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.bankDeposits.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right">₹{row.refunds.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">₹{row.expectedClosingCash.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">₹{row.actualCashCounted.toLocaleString('en-IN')}</td>
                        <td className={`p-3 text-right font-bold ${row.difference === 0 ? 'text-slate-400' : 'text-amber-500'}`}>
                          ₹{row.difference.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <Badge variant={row.isLocked ? 'emerald' : 'outline'}>
                            {row.isLocked ? 'Locked' : 'Open'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Sticky Monthly Totals Row */}
                  <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-mono text-xs font-extrabold shadow-lg">
                    <tr>
                      <td className="sticky left-0 z-30 bg-slate-900 p-3 text-left border-r border-slate-700 font-sans uppercase tracking-wider text-[10px]">
                        MONTH TOTALS
                      </td>
                      <td className="p-3 text-right text-slate-400">₹{monthlyRegisterData.totals.openingCash.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-blue-400">₹{monthlyRegisterData.totals.cashSales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.cardSales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.upiSales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.membershipCash.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.membershipCard.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.membershipUpi.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.giftCardSales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.packageSales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-red-400">₹{monthlyRegisterData.totals.expenses.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.salaryPayments.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.staffAdvances.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.vaultHandover.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.bankDeposits.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{monthlyRegisterData.totals.refunds.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-blue-400">₹{monthlyRegisterData.totals.expectedClosingCash.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-emerald-400">₹{monthlyRegisterData.totals.actualCashCounted.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-amber-400">₹{monthlyRegisterData.totals.difference.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: LIVE DAILY REGISTER (MASTER SHEET VIEW) */}
        {activeTab === 'daily' && liveRegister && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Daily Master Register View ({selectedDate})
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      All columns auto-fed by transactions. Formula cells are locked against manual edits.
                    </p>
                  </div>
                  <Badge variant={liveRegister.isLocked ? 'emerald' : 'blue'}>
                    {liveRegister.isLocked ? 'LOCKED' : 'LIVE FORMULA'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                  <div className="p-4 rounded-2xl bg-[#f6f8fb] dark:bg-slate-800/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500">1. Carried Opening Cash</span>
                    <p className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
                      ₹{liveRegister.openingCash.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 space-y-1">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">2. Cash Sales (Bookings)</span>
                    <p className="font-mono text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      +₹{liveRegister.cashSales.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f6f8fb] dark:bg-slate-800/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500">3. Card POS Sales</span>
                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                      ₹{liveRegister.cardSales.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f6f8fb] dark:bg-slate-800/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500">4. UPI / Online Sales</span>
                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                      ₹{liveRegister.upiSales.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 space-y-1">
                    <span className="text-[11px] font-bold text-red-600">5. Operational Expenses</span>
                    <p className="font-mono text-xl font-extrabold text-red-600">
                      -₹{liveRegister.expenses.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 space-y-1">
                    <span className="text-[11px] font-bold text-red-600">6. Staff Advances Paid</span>
                    <p className="font-mono text-lg font-bold text-red-600">
                      -₹{liveRegister.staffAdvances.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Formula Expected Closing Cash</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      = Opening + Cash Sales + Mem. Cash + Gift Cards - Expenses - Advances
                    </p>
                  </div>
                  <span className="font-mono text-3xl font-extrabold text-blue-400">
                    ₹{liveRegister.expectedClosingCash.toLocaleString('en-IN')}
                  </span>
                </div>
              </Card>
            </div>

            {/* End of Day Reconciliation Panel */}
            <div className="space-y-6">
              <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> End of Day Cash Reconciliation
                </h3>

                <div className="space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Actual Physical Cash Counted (₹)
                    </label>
                    <Input
                      type="number"
                      disabled={liveRegister.isLocked}
                      value={actualCashCounted}
                      onChange={(e) => setActualCashCounted(Number(e.target.value))}
                      className="h-11 text-base font-mono font-extrabold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f6f8fb] dark:bg-slate-800 flex justify-between items-center">
                    <span>Difference / Cash Mismatch:</span>
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        actualCashCounted - liveRegister.expectedClosingCash === 0
                          ? 'text-emerald-600'
                          : 'text-amber-500'
                      }`}
                    >
                      ₹{(actualCashCounted - liveRegister.expectedClosingCash).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {!liveRegister.isLocked ? (
                    <Button
                      onClick={handleLockDay}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-11 shadow-surface mt-2"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Reconcile &amp; Lock Day
                    </Button>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold text-center">
                      ✓ Day Locked by {liveRegister.closedBy}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: CHRONOLOGICAL CASH BOOK STREAM */}
        {activeTab === 'cashbook' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Chronological Cash Book Stream ({selectedDate})
                </h3>
                <p className="text-xs text-slate-400 font-medium">Real-time audit log of every physical cash entry and exit.</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Account Category</TableHead>
                  <TableHead className="text-right">Cash IN (₹)</TableHead>
                  <TableHead className="text-right">Cash OUT (₹)</TableHead>
                  <TableHead className="text-right">Running Balance (₹)</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashBookEntries.map((cb) => (
                  <TableRow key={cb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <TableCell className="font-mono text-slate-500 py-3.5">{cb.time}</TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={cb.type === 'IN' ? 'emerald' : cb.type === 'OUT' ? 'destructive' : 'blue'}>
                        {cb.type === 'IN' ? <ArrowUpRight className="w-3 h-3 mr-1 inline" /> : cb.type === 'OUT' ? <ArrowDownLeft className="w-3 h-3 mr-1 inline" /> : null}
                        {cb.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white py-3.5">{cb.category}</TableCell>
                    <TableCell className="font-mono font-bold text-right text-emerald-600 py-3.5">
                      {cb.type === 'IN' ? `+₹${cb.amount.toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-right text-red-600 py-3.5">
                      {cb.type === 'OUT' ? `-₹${cb.amount.toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-extrabold text-right text-blue-600 dark:text-blue-400 py-3.5">
                      ₹{cb.runningBalance.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 py-3.5 max-w-xs truncate">{cb.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 4: GENERAL LEDGER JOURNAL */}
        {activeTab === 'journal' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-blue-600" /> Immutable General Ledger Double-Entry Journal
                </h3>
                <p className="text-xs text-slate-400 font-medium">ERP Double-Entry Journal. Every entry balances Debit and Credit accounts.</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn Ref</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Debit Account (+)</TableHead>
                  <TableHead>Credit Account (-)</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glTransactions.map((t) => (
                  <TableRow key={t.transactionId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5">{t.transactionId}</TableCell>
                    <TableCell className="font-mono text-slate-500 py-3.5">{t.date} {t.time}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white py-3.5">
                      <span className="font-mono text-[10px] text-slate-400 mr-1">[{t.debitAccountCode}]</span> {t.debitAccountName}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white py-3.5">
                      <span className="font-mono text-[10px] text-slate-400 mr-1">[{t.creditAccountCode}]</span> {t.creditAccountName}
                    </TableCell>
                    <TableCell className="font-mono font-extrabold text-right text-slate-900 dark:text-white py-3.5">
                      ₹{t.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="py-3.5"><Badge variant="secondary">{t.moduleRef}</Badge></TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={t.status === 'POSTED' ? 'emerald' : 'destructive'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      {t.status === 'POSTED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTxnForReversal(t)}
                          className="h-8 text-xs text-amber-600 hover:bg-amber-50 font-bold rounded-xl"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reversal
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 5: CHART OF ACCOUNTS (COA) */}
        {activeTab === 'chart_of_accounts' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-blue-600" /> Standardized Chart of Accounts (COA)
                </h3>
                <p className="text-xs text-slate-400 font-medium">Assets, Liabilities, Income, and Expense account classifications.</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CHART_OF_ACCOUNTS.map((acc) => (
                  <TableRow key={acc.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5">{acc.code}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white py-3.5">{acc.name}</TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant={acc.category === 'ASSET' ? 'emerald' : acc.category === 'LIABILITY' ? 'warning' : acc.category === 'INCOME' ? 'blue' : 'destructive'}>
                        {acc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 py-3.5">{acc.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* REOPEN MODAL */}
        {isReopenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-amber-500" /> Request Finance Reopen: {selectedDate}
                </h3>
                <button onClick={() => setIsReopenModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReopenDay} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Mandatory Reopen Reason</label>
                  <Input
                    placeholder="e.g. Audit correction for unrecorded cash deposit"
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsReopenModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-10 px-5">
                    Reopen Day &amp; Log Audit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVERSAL MODAL */}
        {selectedTxnForReversal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" /> Reverse Transaction {selectedTxnForReversal.transactionId}
                </h3>
                <button onClick={() => setSelectedTxnForReversal(null)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReverseTransaction} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Reversal Reason</label>
                  <Input
                    placeholder="e.g. Transaction posted to incorrect centre"
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTxnForReversal(null)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-10 px-5">
                    Post Counter Reversal Entry
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
