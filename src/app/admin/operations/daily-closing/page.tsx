'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { revalidateOperationalViews } from '@/app/actions/operations';
import { businessDayEngine } from '@/features/business-day-engine';
import { operationsEngine } from '@/features/operations/services/operations-engine';
import { GeneralLedgerEntry, CashBookEntry } from '@/features/accounting/types/general-ledger.types';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useAuth } from '@/hooks/use-auth';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  ShieldCheck,
  Building2,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  CheckSquare,
  Square,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Download,
  FileText,
  Calculator,
  Info,
  MapPin,
} from 'lucide-react';

const FALLBACK_CENTRE = { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio' };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const COLUMN_FORMULAS: Record<string, { title: string; formula: string; provenance: string; rule: string }> = {
  date: {
    title: 'Date',
    formula: 'Calendar Date (YYYY-MM-DD)',
    provenance: 'Daily accounting calendar entry.',
    rule: 'Calculated sequentially for each calendar day of the selected month.',
  },
  totalSales: {
    title: 'Total Sales (Gross Revenue)',
    formula: '= Cash Sales + Card Sales + UPI 1 + UPI 2 + Membership Sales + Gift Card Sales + Other Income',
    provenance: 'Sum of all new financial revenue entering the business across service bookings, product sales, memberships, and auxiliary income.',
    rule: 'Represents total gross financial inflow for the day.',
  },
  cashSales: {
    title: 'Cash Sales',
    formula: '= Direct Cash Bookings + Cash Membership Purchases',
    provenance: 'Physical cash collected at desk for service appointments and membership packages.',
    rule: 'Directly increments Today\'s Cash Drawer Inflows.',
  },
  cardSales: {
    title: 'Card Sales (POS)',
    formula: '= Direct POS Card Bookings + Card Membership Purchases',
    provenance: 'Pine Labs / Ezetap / Razorpay POS card terminal transactions.',
    rule: 'Settled directly into company bank accounts.',
  },
  upi1Sales: {
    title: 'UPI 1 (Primary QR Code)',
    formula: '= Direct UPI 1 Bookings + UPI 1 Membership Payments',
    provenance: 'Primary QR Code / Soundbox UPI transactions (HDFC / ICICI Merchant QR).',
    rule: 'Instant digital bank settlement.',
  },
  upi2Sales: {
    title: 'UPI 2 (Secondary QR Code)',
    formula: '= Direct UPI 2 Bookings + UPI 2 Membership Payments',
    provenance: 'Secondary QR Code / Backup UPI merchant account.',
    rule: 'Instant digital bank settlement.',
  },
  membershipSales: {
    title: 'Membership Sales',
    formula: '= Membership Cash + Membership Card + Membership UPI',
    provenance: 'New prepaid membership passes and VIP package purchases.',
    rule: 'Recognized as financial revenue on day of purchase.',
  },
  giftCardSales: {
    title: 'Gift Card Sales',
    formula: '= Gift Vouchers Purchased',
    provenance: 'Sales of Moroccan Spa luxury gift cards and gift vouchers.',
    rule: 'Recognized as financial revenue on day of voucher issuance.',
  },
  otherIncome: {
    title: 'Other Income',
    formula: '= Direct Cash In Transactions',
    provenance: 'Auxiliary cash inflows, petty cash additions, and miscellaneous revenues.',
    rule: 'Increments Cash Drawer Inflow.',
  },
  expenses: {
    title: 'Expenses',
    formula: '= Sum of Daily Petty Cash Expenses',
    provenance: 'Laundry, essential argan oils, tea refreshments, utility payments, and daily operational expenditures.',
    rule: 'Decrements Cash Drawer Outflow.',
  },
  cashWithdrawn: {
    title: 'Cash Withdrawn (Handover / Bank Deposit)',
    formula: '= Cash Handover + Bank Deposits',
    provenance: 'Cash removed from desk drawer for vault transfer or bank deposit.',
    rule: 'Decrements Cash Drawer Outflow.',
  },
  refunds: {
    title: 'Refunds',
    formula: '= Customer Cash Refunds',
    provenance: 'Cash refunds issued to customers for cancelled or adjusted bookings.',
    rule: 'Decrements Cash Drawer Outflow.',
  },
  openingCash: {
    title: 'Opening Cash',
    formula: '= Previous Day\'s Verified Closing Cash Drawer SSOT',
    provenance: 'Carried forward directly from the previous day\'s verified closing drawer balance.',
    rule: 'Must equal previous day\'s closing cash balance.',
  },
  closingCash: {
    title: 'Closing Cash (Cash Drawer SSOT)',
    formula: '= Opening Cash + Total Cash In Today - Total Cash Out Today',
    provenance: 'Single Source of Truth (SSOT) physical cash remaining in desk drawer at day end.',
    rule: 'Must match physical cash count entered during manager day closing.',
  },
  status: {
    title: 'Closing Status',
    formula: '= Is Locked ? "Closed" : "Open"',
    provenance: 'Operational lock status set upon manager day closure execution.',
    rule: 'Closed days are locked and immutable.',
  },
};

export default function FinancialClosingPage() {
  const { selectedCentreId, setSelectedCentreId, activeCentreFilter, isSuperAdmin, assignedCentre, centres } = useCentreContext();
  const { user } = useAuth();

  // Selected Scope Controls
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(6); // 0-indexed (6 = July)
  const [activeTab, setActiveTab] = useState<'daily' | 'reports' | 'monthly'>('daily');

  // Sheet Zoom & Formula Bar States
  const [sheetZoomLevel, setSheetZoomLevel] = useState(100);
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>('totalSales');
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    colKey: string;
    rowData: any;
  } | null>(null);

  const getCellFormulaDetails = (cell: { date: string; colKey: string; rowData: any }) => {
    const r = cell.rowData;
    const date = r.date;
    const col = cell.colKey;

    const totalSales = r.financialRevenue + r.cashInOther;
    const cashSales = r.cashSales + r.membershipCash;
    const cardSales = r.cardSales + r.membershipCard;
    const upi1Sales = r.upi1Sales || 0;
    const upi2Sales = r.upi2Sales || 0;
    const membershipSales = r.membershipCash + r.membershipCard + r.membershipUpi;
    const giftCardSales = r.giftCardSales;
    const otherIncome = r.cashInOther;
    const expenses = r.expenses;
    const cashWithdrawn = r.cashHandover;
    const refunds = r.refunds;
    const openingCash = r.openingCash;
    const closingCash = r.expectedClosingCash;

    switch (col) {
      case 'totalSales':
        return {
          cellRef: `Total Sales [Date: ${date}]`,
          equation: `= ₹${cashSales.toLocaleString('en-IN')} (Cash) + ₹${cardSales.toLocaleString('en-IN')} (Card) + ₹${upi1Sales.toLocaleString('en-IN')} (UPI 1) + ₹${upi2Sales.toLocaleString('en-IN')} (UPI 2) + ₹${membershipSales.toLocaleString('en-IN')} (Membership) + ₹${giftCardSales.toLocaleString('en-IN')} (Gift Cards) + ₹${otherIncome.toLocaleString('en-IN')} (Other)`,
          resultText: `= ₹${totalSales.toLocaleString('en-IN')}`,
          explanation: `Total gross revenue for ${date} calculated across all active payment channels.`,
        };
      case 'cashSales':
        return {
          cellRef: `Cash Sales [Date: ${date}]`,
          equation: `= ₹${(r.cashSales || 0).toLocaleString('en-IN')} (Booking Cash) + ₹${(r.membershipCash || 0).toLocaleString('en-IN')} (Membership Cash)`,
          resultText: `= ₹${cashSales.toLocaleString('en-IN')}`,
          explanation: `Physical cash collected at front desk on ${date}. Direct cash inflow into drawer.`,
        };
      case 'cardSales':
        return {
          cellRef: `Card Sales [Date: ${date}]`,
          equation: `= ₹${(r.cardSales || 0).toLocaleString('en-IN')} (POS Booking Card) + ₹${(r.membershipCard || 0).toLocaleString('en-IN')} (Membership Card)`,
          resultText: `= ₹${cardSales.toLocaleString('en-IN')}`,
          explanation: `Card payments settled via POS payment terminals into bank accounts.`,
        };
      case 'upi1Sales':
        return {
          cellRef: `UPI 1 Sales [Date: ${date}]`,
          equation: `= Direct UPI 1 Soundbox / Primary QR Settlements`,
          resultText: `= ₹${upi1Sales.toLocaleString('en-IN')}`,
          explanation: `Digital settlements via Primary UPI Merchant QR code on ${date}.`,
        };
      case 'upi2Sales':
        return {
          cellRef: `UPI 2 Sales [Date: ${date}]`,
          equation: `= Secondary QR Code / Backup UPI Merchant Payments`,
          resultText: `= ₹${upi2Sales.toLocaleString('en-IN')}`,
          explanation: `Digital settlements via Secondary UPI Merchant QR code on ${date}.`,
        };
      case 'membershipSales':
        return {
          cellRef: `Membership Sales [Date: ${date}]`,
          equation: `= ₹${(r.membershipCash || 0).toLocaleString('en-IN')} (Cash) + ₹${(r.membershipCard || 0).toLocaleString('en-IN')} (Card) + ₹${(r.membershipUpi || 0).toLocaleString('en-IN')} (UPI)`,
          resultText: `= ₹${membershipSales.toLocaleString('en-IN')}`,
          explanation: `Prepaid membership pass sales and package purchases on ${date}.`,
        };
      case 'giftCardSales':
        return {
          cellRef: `Gift Card Sales [Date: ${date}]`,
          equation: `= Sales of Gift Vouchers & Cards`,
          resultText: `= ₹${giftCardSales.toLocaleString('en-IN')}`,
          explanation: `Voucher sales issued for future spa appointments on ${date}.`,
        };
      case 'otherIncome':
        return {
          cellRef: `Other Income [Date: ${date}]`,
          equation: `= Auxiliary Petty Cash In Inflows`,
          resultText: `= ₹${otherIncome.toLocaleString('en-IN')}`,
          explanation: `Direct petty cash additions or non-service cash receipts on ${date}.`,
        };
      case 'expenses':
        return {
          cellRef: `Expenses [Date: ${date}]`,
          equation: `= Sum of Petty Cash Vouchers (Linen, Oils, Tea, Maintenance)`,
          resultText: `= ₹${expenses.toLocaleString('en-IN')}`,
          explanation: `Total operational petty cash spent from desk drawer on ${date}.`,
        };
      case 'cashWithdrawn':
        return {
          cellRef: `Cash Withdrawn [Date: ${date}]`,
          equation: `= Cash Handover to Vault + Bank Cash Deposits`,
          resultText: `= ₹${cashWithdrawn.toLocaleString('en-IN')}`,
          explanation: `Cash removed from desk drawer for vault safe or bank deposit on ${date}.`,
        };
      case 'refunds':
        return {
          cellRef: `Refunds [Date: ${date}]`,
          equation: `= Customer Cash Refund Adjustments`,
          resultText: `= ₹${refunds.toLocaleString('en-IN')}`,
          explanation: `Cash refunds issued for cancelled appointments on ${date}.`,
        };
      case 'openingCash':
        return {
          cellRef: `Opening Cash [Date: ${date}]`,
          equation: `= Carried forward from previous day's verified closing cash drawer SSOT`,
          resultText: `= ₹${openingCash.toLocaleString('en-IN')}`,
          explanation: `Single Source of Truth opening cash balance on ${date}.`,
        };
      case 'closingCash':
        return {
          cellRef: `Closing Cash SSOT [Date: ${date}]`,
          equation: `= ₹${openingCash.toLocaleString('en-IN')} (Opening Cash) + ₹${(r.totalCashInToday || 0).toLocaleString('en-IN')} (Cash In) - ₹${(r.totalCashOutToday || 0).toLocaleString('en-IN')} (Cash Out)`,
          resultText: `= ₹${closingCash.toLocaleString('en-IN')}`,
          explanation: `Physical cash drawer balance at day end on ${date}.`,
        };
      default:
        return {
          cellRef: `Date [${date}]`,
          equation: `Calendar Accounting Date`,
          resultText: date,
          explanation: `Sequential calendar day entry.`,
        };
    }
  };

  const handleZoomIn = () => setSheetZoomLevel((prev) => Math.min(150, prev + 15));
  const handleZoomOut = () => setSheetZoomLevel((prev) => Math.max(70, prev - 15));
  const handleResetZoom = () => setSheetZoomLevel(100);

  const exportToExcelCSV = () => {
    if (!singleCentreMonthly) return;
    const headers = [
      'Date',
      'Total Sales (INR)',
      'Cash Sales (INR)',
      'Card Sales (INR)',
      'UPI 1 (INR)',
      'UPI 2 (INR)',
      'Membership Sales (INR)',
      'Gift Card Sales (INR)',
      'Other Income (INR)',
      'Expenses (INR)',
      'Cash Withdrawn (INR)',
      'Refunds (INR)',
      'Opening Cash (INR)',
      'Closing Cash (INR)',
      'Closing Status',
    ];

    const rows = singleCentreMonthly.rows.map((r) => [
      r.date,
      r.financialRevenue + r.cashInOther,
      r.cashSales + r.membershipCash,
      r.cardSales + r.membershipCard,
      r.upi1Sales || 0,
      r.upi2Sales || 0,
      r.membershipCash + r.membershipCard + r.membershipUpi,
      r.giftCardSales,
      r.cashInOther,
      r.expenses,
      r.cashHandover,
      r.refunds,
      r.openingCash,
      r.expectedClosingCash,
      r.isLocked ? 'Closed' : 'Open',
    ]);

    const t = singleCentreMonthly.totals;
    const totalRow = [
      'MONTHLY TOTALS',
      t.totalSales,
      t.cashSales,
      t.cardSales,
      t.upi1Sales,
      t.upi2Sales,
      t.membershipSales,
      t.giftCardSales,
      t.otherIncome,
      t.expenses,
      t.cashHandover,
      t.refunds,
      t.openingCash,
      t.closingCash,
      `${t.closedDaysCount}/${t.totalDaysCount} Days Closed`,
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(',')), totalRow.join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Moroccan_Spa_${currentCentreObj.name.replace(/[^a-zA-Z0-9]/g, '_')}_Monthly_Financial_Statement_${selectedYear}_${selectedMonthIndex + 1}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Monthly Financial Statement exported as Excel CSV!');
  };

  const printTargetElement = (elementId: string, docTitle: string) => {
    const elem = document.getElementById(elementId);
    if (!elem) {
      toast.error('Print target table or sheet not found.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1150,height=850');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print target sheets.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; background: #ffffff; }
            .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company-name { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; }
            .doc-subtitle { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-top: 4px; }
            .meta-info { font-size: 11px; font-family: monospace; text-align: right; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background-color: #0f172a !important; color: #ffffff !important; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bg-emerald-50, .bg-emerald-50\\/30 { background-color: #f0fdf4 !important; }
            .bg-amber-50, .bg-amber-50\\/40 { background-color: #fffbeb !important; }
            .bg-slate-900 { background-color: #0f172a !important; color: #ffffff !important; }
            .bg-slate-800 { background-color: #1e293b !important; color: #ffffff !important; }
            .text-emerald-400, .text-emerald-600 { color: #059669 !important; font-weight: bold; }
            .text-amber-300, .text-amber-600 { color: #d97706 !important; font-weight: bold; }
            .text-blue-300, .text-blue-600 { color: #2563eb !important; font-weight: bold; }
            .text-red-400, .text-red-600 { color: #dc2626 !important; font-weight: bold; }
            .footer-note { margin-top: 25px; pt: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div class="company-name">MOROCCAN SPA &amp; HAMMAM</div>
              <div class="doc-subtitle">${docTitle}</div>
            </div>
            <div class="meta-info">
              <div>Scope: ${currentCentreObj.name}</div>
              <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          ${elem.outerHTML}
          <div class="footer-note">
            Official System Generated Financial Document • Moroccan Spa Management OS
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Live Accounting States
  const [liveRegister, setLiveRegister] = useState<ReturnType<typeof operationsEngine.getDailyRegister> | null>(null);
  const [centresOverview, setCentresOverview] = useState<ReturnType<typeof operationsEngine.getCentresOverview>>([]);
  const [multiCentreMonthly, setMultiCentreMonthly] = useState<ReturnType<typeof operationsEngine.getMultiCentreMonthlySummary> | null>(null);
  const [singleCentreMonthly, setSingleCentreMonthly] = useState<ReturnType<typeof operationsEngine.getMonthlyRegister> | null>(null);

  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [glTransactions, setGlTransactions] = useState<GeneralLedgerEntry[]>([]);

  // Closing Reconciliation States
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [mismatchReason, setMismatchReason] = useState<string>('');
  const [closureRemarks, setClosureRemarks] = useState<string>('');

  // Checklist Items (All 6 Must Pass to Close)
  const [checklist, setChecklist] = useState({
    bookingsInvoiced: true,
    paymentsReconciled: true,
    cashCounted: false,
    expensesRecorded: true,
    digitalVerified: true,
    noPendingTx: true,
  });

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const isAllScope = selectedCentreId === 'all' || !activeCentreFilter || activeCentreFilter === 'all';

  const userRole = (user?.role || '').toLowerCase();
  const canCloseAccounts = isSuperAdmin || ['admin', 'centre_admin', 'manager', 'centre_manager'].includes(userRole);

  const currentCentreObj = isAllScope
    ? { id: 'all', name: 'Consolidated Overview (All Spa Centres)' }
    : (centres && centres.find((c) => c.id === activeCentreFilter)) || assignedCentre || centres[0] || FALLBACK_CENTRE;

  const yearMonthStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  const loadData = async () => {
    if (!currentCentreObj) return;

    try {
      // 1. Live Daily Register (from Business Day Engine SSOT)
      const reg = await businessDayEngine.getDailyRegister(currentCentreObj.id, selectedDate);
      setLiveRegister(reg as any);
      setActualCashCounted(reg.actualCashCounted);
      setMismatchReason(reg.mismatchReason || '');
      setClosureRemarks(reg.remarks || '');

      // 2. Excel Monthly Register (from Business Day Engine SSOT)
      const monthly = await businessDayEngine.getMonthlyRegisterMatrix(currentCentreObj.id, yearMonthStr);
      setSingleCentreMonthly({ rows: monthly.rows as any, totals: monthly.totals as any });

      // 3. Cash Book & GL Journal (from Business Day Engine SSOT)
      const cb = await businessDayEngine.getCashBook(currentCentreObj.id, selectedDate);
      setCashBookEntries(cb as any);

      const gl = await businessDayEngine.getGLTransactions(currentCentreObj.id);
      setGlTransactions(gl as any);
    } catch (err) {
      console.error('[DailyClosing] Error loading SSOT data from BusinessDayEngine:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCentreId, activeCentreFilter, selectedDate, selectedYear, selectedMonthIndex]);

  // Handle Cash Count Change & Checklist Sync
  const handleCashCountChange = (val: number) => {
    setActualCashCounted(val);
    setChecklist((prev) => ({
      ...prev,
      cashCounted: val > 0 || (liveRegister ? liveRegister.expectedClosingCash === 0 : false),
    }));
  };

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

  // Lock Business Day Handler
  const handleCloseDayAccounts = async () => {
    if (!liveRegister) return;
    const targetCentreId = currentCentreObj.id;

    const allChecklistPassed = Object.values(checklist).every(Boolean);
    if (!allChecklistPassed) {
      toast.error('Please complete all 6 manager checklist items before closing accounts!');
      return;
    }

    const variance = actualCashCounted - liveRegister.expectedClosingCash;
    if (variance !== 0 && !mismatchReason.trim()) {
      toast.error(`Cash count mismatch detected (Variance: ₹${variance}). Mismatch Reason is required.`);
      return;
    }

    try {
      await operationsEngine.lockDay({
        centreId: targetCentreId,
        date: selectedDate,
        actualCashCounted,
        mismatchReason: variance !== 0 ? mismatchReason : undefined,
        remarks: closureRemarks,
        closedBy: user?.email || 'Centre Manager',
      });

      await revalidateOperationalViews();
      toast.success(`Day ${selectedDate} closed & accounts locked permanently!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to lock business day.');
    }
  };

  // Reopen Day Handler (Super Admin Only)
  const handleReopenDay = async () => {
    if (!reopenReason.trim()) {
      toast.error('Reason for reopening accounts is mandatory for audit trail.');
      return;
    }

    const targetCentreId = currentCentreObj.id;

    try {
      await operationsEngine.unlockDay({
        centreId: targetCentreId,
        date: selectedDate,
        unlockedBy: user?.email || 'Super Admin',
        reason: reopenReason,
      });

      await revalidateOperationalViews();
      toast.success(`Accounts for ${selectedDate} have been reopened.`);
      setIsReopenModalOpen(false);
      setReopenReason('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reopen business day.');
    }
  };

  const reg = liveRegister;
  const isLocked = reg?.isLocked || false;
  const variance = reg ? actualCashCounted - reg.expectedClosingCash : 0;
  const allChecklistPassed = Object.values(checklist).every(Boolean);

  return (
    <PageShell
      title="Financial Closing"
      description="Day End Financial Reconciliation System: Verify daily sales, cash drawer counts, digital collections, and execute immutable accounts closing."
    >
      <div className="space-y-6">
        {/* TOP BAR 1: CENTRE OVERVIEW TABLE (SUPER ADMIN CONTROL ONLY) */}
        {isSuperAdmin && (
          <Card className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border-none shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm tracking-tight text-white">Centre Financial Closing Overview (Super Admin Only)</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-blue-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 rounded-lg bg-slate-800 border-slate-700 text-white font-bold text-xs w-36"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {centresOverview.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-white">{c.shortName}</span>
                    <Badge
                      variant={c.status === 'Closed' ? 'emerald' : c.status === 'Review' ? 'gold' : 'blue'}
                      className="text-[10px] uppercase font-mono font-extrabold"
                    >
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono border-t border-slate-700/50">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Sales</span>
                      <span className="text-xs font-bold text-emerald-400">₹{c.sales.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Cash</span>
                      <span className="text-xs font-bold text-amber-300">₹{c.cash.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Digital</span>
                      <span className="text-xs font-bold text-blue-300">₹{c.digital.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {c.variance !== 0 && (
                    <div className="text-[10px] text-amber-400 font-mono font-bold text-right pt-0.5">
                      Variance: ₹{c.variance.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* TOP BAR 2: SUB-NAVIGATION TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'daily'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Daily Closing
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Daily Reports
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Monthly Summary
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const res = operationsEngine.seedMonthTestData();
                  toast.success(`Generated ${res.transactionsCount} test transactions for all 3 centres across July 2026!`);
                  loadData();
                }}
                className="rounded-xl h-9 text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Seed 1 Month Test Data
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                printTargetElement(
                  activeTab === 'monthly'
                    ? 'printable-monthly-financial-sheet'
                    : activeTab === 'reports'
                    ? 'printable-cashbook-audit-stream'
                    : 'printable-daily-closing-reconciliation',
                  activeTab === 'monthly'
                    ? 'Monthly Financial Statement'
                    : activeTab === 'reports'
                    ? 'Daily Cash Book Audit Stream'
                    : 'Day End Financial Closing Reconciliation'
                )
              }
              className="rounded-xl h-9 text-xs font-bold"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print Sheet
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DAILY CLOSING (COMPLETE RECONCILIATION ENGINE) */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && reg && (
          <div className="space-y-6">
            {/* F. DAILY SUMMARY CARD (TOP 5-SECOND OWNER SUMMARY CARD) */}
            <Card className="p-5 rounded-2xl bg-slate-900 text-white border-none shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-white">Daily Financial Summary</h3>
                </div>
                <Badge variant={isLocked ? 'emerald' : 'gold'} className="font-mono text-xs font-bold">
                  {isLocked ? 'DAY CLOSED & LOCKED' : 'ACCOUNTS OPEN'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales Today</span>
                  <span className="font-mono font-extrabold text-base text-emerald-400">
                    ₹{reg.financialRevenue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Expenses</span>
                  <span className="font-mono font-extrabold text-base text-red-400">
                    ₹{reg.expenses.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Today Net Movement</span>
                  <span className={`font-mono font-extrabold text-base ${reg.todayNetCashMovement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reg.todayNetCashMovement >= 0 ? '+' : ''}₹{reg.todayNetCashMovement.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Closing Cash (Drawer SSOT)</span>
                  <span className="font-mono font-extrabold text-base text-amber-300">
                    ₹{reg.expectedClosingCash.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Digital Collections</span>
                  <span className="font-mono font-extrabold text-base text-blue-300">
                    ₹{(reg.cardSales + reg.upiSales + reg.membershipCard + reg.membershipUpi).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Other Income</span>
                  <span className="font-mono font-extrabold text-base text-cyan-300">
                    ₹{reg.cashInOther.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Withdrawn</span>
                  <span className="font-mono font-extrabold text-base text-purple-300">
                    ₹{reg.cashHandover.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Refunds</span>
                  <span className="font-mono font-extrabold text-base text-rose-400">
                    ₹{reg.refunds.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            {/* 5 LOGICAL FINANCIAL SECTIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* SECTION A: SALES TODAY */}
              <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-none">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> A. Sales Today
                  </h4>
                  <Badge variant="blue" className="text-[10px]">No Subtractions</Badge>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Service Sales:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{(reg.cashSales + reg.cardSales + reg.upiSales).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Membership Sales:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{(reg.membershipCash + reg.membershipCard + reg.membershipUpi).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Gift Card Sales:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{reg.giftCardSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Other Income:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{reg.cashInOther.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Total Sales Today:</span>
                    <span className="font-mono text-base">₹{(reg.financialRevenue + reg.cashInOther).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </Card>

              {/* SECTION B: PAYMENT BREAKDOWN */}
              <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-none">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" /> B. Payment Breakdown
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Collections</Badge>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cash:</span>
                    <span className="font-mono font-bold text-amber-600">
                      ₹{(reg.cashSales + reg.membershipCash + reg.cashInOther).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Card Payment (POS):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{(reg.cardSales + reg.membershipCard).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">UPI 1:</span>
                    <span className="font-mono font-bold text-blue-600">
                      ₹{(reg.upi1Sales || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">UPI 2:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      ₹{(reg.upi2Sales || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-slate-700 dark:text-slate-300">
                    <span>Total Digital Collections:</span>
                    <span className="font-mono text-blue-600">
                      ₹{(reg.cardSales + reg.upiSales + reg.membershipCard + reg.membershipUpi).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                    <span>Total Payments Received:</span>
                    <span className="font-mono text-base">₹{(reg.financialRevenue + reg.cashInOther).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </Card>

              {/* SECTION C: CASH MOVEMENT (DRAWER RECONCILIATION FROM CASH REGISTER SSOT) */}
              <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-none bg-amber-50/30 dark:bg-amber-950/20">
                <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
                  <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-600" /> C. Physical Cash Drawer
                  </h4>
                  <Badge variant="gold" className="text-[10px]">Register SSOT</Badge>
                </div>
                <div className="space-y-1.5 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Opening Cash (Carried Forward):</span>
                    <span className="font-mono font-bold">₹{reg.openingCash.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Today Cash Inflows:</span>
                    <span className="font-mono font-bold text-emerald-600">+₹{reg.totalCashInToday.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Today Cash Outflows:</span>
                    <span className="font-mono font-bold text-red-600">-₹{reg.totalCashOutToday.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-amber-200 dark:border-amber-800 pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Today Net Cash Movement:</span>
                    <span className={`font-mono font-bold ${reg.todayNetCashMovement >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {reg.todayNetCashMovement >= 0 ? '+' : ''}₹{reg.todayNetCashMovement.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-amber-300 dark:border-amber-700 flex justify-between font-extrabold text-xs text-slate-900 dark:text-white">
                    <span>Closing Cash (Register SSOT):</span>
                    <span className="font-mono font-extrabold text-amber-600 text-sm">₹{reg.expectedClosingCash.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-2 space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">Actual Cash Counted (Manager Entry)</label>
                    <Input
                      type="number"
                      value={actualCashCounted}
                      onChange={(e) => handleCashCountChange(Number(e.target.value))}
                      disabled={isLocked}
                      className="h-10 rounded-xl font-mono font-bold text-sm bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-between font-extrabold text-xs pt-1">
                    <span>Variance:</span>
                    <span className={`font-mono font-extrabold ${variance === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{variance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </Card>

              {/* SECTION D: EXPENSES & CASH OUT */}
              <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-none">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-red-600" /> D. Expenses &amp; Cash Out
                  </h4>
                  <Badge variant="destructive" className="text-[10px]">Outflows</Badge>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Operational Expenses:</span>
                    <span className="font-mono font-bold text-red-600">₹{reg.expenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cash Withdrawals:</span>
                    <span className="font-mono font-bold text-purple-600">₹{reg.cashHandover.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Vendor Payments:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{reg.expenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Salary &amp; Staff Advances:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{(reg.salaryPayments + reg.staffAdvances).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cash Refunds:</span>
                    <span className="font-mono font-bold text-rose-600">₹{reg.refunds.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-extrabold text-sm text-red-600">
                    <span>Total Cash Outflows:</span>
                    <span className="font-mono text-base">
                      ₹{(reg.expenses + reg.cashHandover + reg.salaryPayments + reg.staffAdvances + reg.refunds + reg.cashOutOther).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </Card>

              {/* SECTION E: OTHER TRANSACTIONS (NON-CASH BUSINESS ACTIVITY) */}
              <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-none">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" /> E. Other Transactions
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Non-Cash Activity</Badge>
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Membership Redemptions:</span>
                    <span className="font-mono font-bold text-purple-600">
                      ₹{reg.membershipRedemptionsValue.toLocaleString('en-IN')} ({reg.membershipRedemptionsCount} Uses)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Gift Card Redemptions:</span>
                    <span className="font-mono font-bold text-purple-600">
                      ₹{reg.giftCardRedemptionsValue.toLocaleString('en-IN')} ({reg.giftCardRedemptionsCount} Uses)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Offer / Coupon Discounts:</span>
                    <span className="font-mono font-bold text-emerald-600">₹0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Manual Adjustments:</span>
                    <span className="font-mono font-bold text-amber-600">₹{variance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Other Non-Sales Income:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{reg.cashInOther.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </Card>

              {/* MANAGER CLOSING CHECKLIST & ONE-CLICK CLOSING CARD */}
              <Card className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-3 shadow-none">
                <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
                  <h4 className="font-extrabold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Manager Closing Checklist
                  </h4>
                  <Badge variant={allChecklistPassed ? 'emerald' : 'gold'} className="text-[10px] font-mono font-bold">
                    {allChecklistPassed ? '6/6 Ready' : 'Pending Verification'}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  {Object.entries({
                    bookingsInvoiced: 'All bookings invoiced & assigned',
                    paymentsReconciled: 'Payments reconciled across methods',
                    cashCounted: 'Cash drawer counted & entered',
                    expensesRecorded: 'Daily expenses recorded & verified',
                    digitalVerified: 'Digital collections verified on POS',
                    noPendingTx: 'No pending or unclosed transactions',
                  }).map(([key, label]) => {
                    const isChecked = (checklist as any)[key];
                    return (
                      <button
                        key={key}
                        onClick={() => !isLocked && canCloseAccounts && setChecklist((prev) => ({ ...prev, [key]: !isChecked }))}
                        disabled={isLocked || !canCloseAccounts}
                        className="flex items-center gap-2 text-left w-full cursor-pointer hover:text-blue-600 transition-colors disabled:cursor-not-allowed"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={isChecked ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  {!isLocked ? (
                    canCloseAccounts ? (
                      <Button
                        onClick={handleCloseDayAccounts}
                        disabled={!allChecklistPassed}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl shadow-lg"
                      >
                        <Lock className="w-4 h-4 mr-1.5" /> Close Today&apos;s Accounts
                      </Button>
                    ) : (
                      <div className="space-y-1.5 text-center">
                        <Button
                          disabled
                          className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold h-11 rounded-xl cursor-not-allowed opacity-80"
                        >
                          <Lock className="w-4 h-4 mr-1.5 text-slate-400" /> Role Restricted: Manager Approval Required
                        </Button>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Financial Closing is open for monitoring. Executing account closure requires Centre Manager or Admin privileges.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2 text-center">
                      <Badge variant="emerald" className="w-full justify-center h-10 font-bold text-xs">
                        ✓ Day Accounts Closed &amp; Locked by {reg.closedBy}
                      </Badge>
                      {isSuperAdmin && (
                        <Button variant="ghost" onClick={() => setIsReopenModalOpen(true)} className="text-xs text-amber-600 font-bold h-8">
                          <Unlock className="w-3.5 h-3.5 mr-1" /> Reopen Accounts (Super Admin)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAILY REPORTS (CASH BOOK & AUDIT JOURNAL) */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" /> Daily Cash Book Audit Stream ({selectedDate})
                </h3>
                <Badge variant="blue">{cashBookEntries.length} Stream Records</Badge>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Flow Type</TableHead>
                        <TableHead>Category &amp; Description</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                        <TableHead className="text-right">Running Balance (₹)</TableHead>
                      </TableRow>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashBookEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400 font-medium">
                          No cash book entries for {selectedDate}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashBookEntries.map((cb) => (
                        <TableRow key={cb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <TableCell className="font-mono text-xs text-slate-500 py-3">{cb.time}</TableCell>
                          <TableCell className="py-3">
                            <Badge variant={cb.type === 'IN' || cb.type === 'OPENING' ? 'emerald' : 'destructive'}>
                              {cb.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-xs text-slate-900 dark:text-white py-3">
                            {cb.category}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs py-3">
                            ₹{cb.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono font-extrabold text-blue-600 text-xs py-3">
                            ₹{cb.runningBalance.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MONTHLY SUMMARY (MULTI-CENTRE SIDE-BY-SIDE MATRIX FIX) */}
        {/* ========================================================================= */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            {/* SHEET SCATTERING SELECTOR BAR (ALL CENTRES VS INDIVIDUAL OUTLET SHEETS) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCentreId('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  isAllScope
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Consolidated Sheet (All Outlets)
              </button>

              {centres.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCentreId(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeCentreFilter === c.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500" /> {c.name} Sheet
                </button>
              ))}
            </div>

            {/* MONTH & YEAR CONTROLS */}
            <Card className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-9 w-9 p-0 rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                  {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                </span>
                <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-9 w-9 p-0 rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Viewing Sheet Scope:</span>
                <Badge variant="blue" className="font-bold text-xs">
                  {currentCentreObj.name}
                </Badge>
              </div>
            </Card>

            {/* IF ALL CENTRES IS SELECTED: MULTI-CENTRE MATRIX + CONSOLIDATED FINANCIAL STATEMENT */}
            {isAllScope && multiCentreMonthly && singleCentreMonthly ? (
              <div className="space-y-6">
                {/* 1. MULTI-CENTRE OUTLETS COMPARISON MATRIX */}
                <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Multi-Centre Outlets Breakdown ({MONTH_NAMES[selectedMonthIndex]} {selectedYear})
                    </h3>
                    <Badge variant="emerald">Side-by-Side 3 Outlets View</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                          <TableHead className="font-extrabold text-xs">Date</TableHead>
                          <TableHead className="text-right font-extrabold text-xs">Lulu Mall (₹)</TableHead>
                          <TableHead className="text-right font-extrabold text-xs">Phoenix Palassio (₹)</TableHead>
                          <TableHead className="text-right font-extrabold text-xs">Holiday Inn (₹)</TableHead>
                          <TableHead className="text-right font-extrabold text-xs text-blue-600 dark:text-blue-400">Organisation Total (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {multiCentreMonthly.rows.map((r) => (
                          <TableRow key={r.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white py-3">
                              {r.date}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 py-3">
                              ₹{r.luluSales.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 py-3">
                              ₹{r.palassioSales.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 py-3">
                              ₹{r.holidaySales.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 py-3 bg-blue-50/30 dark:bg-blue-950/20">
                              ₹{r.orgTotal.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* MULTI-CENTRE SUMMARY FOOTER ROW */}
                        <TableRow className="bg-slate-900 text-white font-extrabold">
                          <TableCell className="py-3.5 text-xs font-extrabold uppercase">MONTHLY TOTALS</TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold py-3.5 text-emerald-400">
                            ₹{multiCentreMonthly.totals.luluSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold py-3.5 text-emerald-400">
                            ₹{multiCentreMonthly.totals.palassioSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold py-3.5 text-emerald-400">
                            ₹{multiCentreMonthly.totals.holidaySales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-extrabold py-3.5 text-amber-300 bg-slate-800">
                            ₹{multiCentreMonthly.totals.orgTotal.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* TOOLBAR FOR MONTHLY FINANCIAL SHEET: FORMULA PROVENANCE, ZOOM CONTROLS, EXPORTS */}
                <Card className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3 shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                        Financial Sheet Controls &amp; Formula Inspector
                      </span>
                    </div>

                    {/* CONTROLS: ZOOM & EXPORT */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* ZOOM CONTROLS */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-7 w-7 p-0 rounded" title="Zoom Out">
                          <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <button onClick={handleResetZoom} className="px-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600">
                          {sheetZoomLevel}%
                        </button>
                        <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-7 w-7 p-0 rounded" title="Zoom In">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* EXPORT EXCEL (.CSV) */}
                      <Button size="sm" variant="outline" onClick={exportToExcelCSV} className="h-8 text-xs font-bold bg-white dark:bg-slate-900 rounded-lg border-slate-200 dark:border-slate-800">
                        <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Export Excel (.CSV)
                      </Button>

                      {/* EXPORT PDF / PRINT */}
                      <Button size="sm" variant="outline" onClick={() => printTargetElement('printable-monthly-financial-sheet', 'Monthly Financial Statement')} className="h-8 text-xs font-bold bg-white dark:bg-slate-900 rounded-lg border-slate-200 dark:border-slate-800">
                        <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" /> Download PDF / Print Sheet
                      </Button>
                    </div>
                  </div>

                  {/* EXCEL-STYLE CELL FORMULA BAR (WHEN A SPECIFIC CELL IS CLICKED) */}
                  {selectedCell && (
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 rounded-xl border border-blue-500/50 shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white font-mono font-black text-[11px] px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                            fx
                          </span>
                          <span className="font-mono text-xs font-extrabold text-blue-300">
                            {getCellFormulaDetails(selectedCell).cellRef}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedCell(null)} className="text-[10px] text-slate-400 hover:text-white underline">
                            Clear Cell Selection
                          </button>
                          <Badge variant="emerald" className="text-[10px] font-mono font-bold">
                            Excel Cell Formula
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-mono text-xs text-amber-300 font-extrabold tracking-tight bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex-1 overflow-x-auto">
                          {getCellFormulaDetails(selectedCell).equation}
                        </div>
                        <div className="font-mono text-sm font-black text-emerald-400 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/80 shrink-0">
                          {getCellFormulaDetails(selectedCell).resultText}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 font-medium italic">
                        ℹ️ {getCellFormulaDetails(selectedCell).explanation}
                      </p>
                    </div>
                  )}

                  {/* DYNAMIC FORMULA & PROVENANCE INSPECTOR DISPLAY */}
                  {selectedColumnKey && COLUMN_FORMULAS[selectedColumnKey] && (
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <Info className="w-3 h-3" /> Selected Column
                        </span>
                        <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {COLUMN_FORMULAS[selectedColumnKey].title}
                        </h5>
                        <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          {COLUMN_FORMULAS[selectedColumnKey].formula}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Data Provenance &amp; Origin
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {COLUMN_FORMULAS[selectedColumnKey].provenance}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Accounting Audit Rule
                        </span>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-semibold bg-emerald-50/50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          ✓ {COLUMN_FORMULAS[selectedColumnKey].rule}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* 2. CONSOLIDATED ORGANISATION MONTHLY FINANCIAL STATEMENT */}
                <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" /> Organisation Consolidated Monthly Financial Statement ({MONTH_NAMES[selectedMonthIndex]} {selectedYear})
                    </h3>
                    <Badge variant="blue">15 Financial Statement Columns</Badge>
                  </div>

                  <div className="overflow-x-auto" style={{ zoom: `${sheetZoomLevel}%` }}>
                    <Table id="printable-monthly-financial-sheet">
                      <TableHeader>
                        <TableRow className="bg-slate-900 text-white border-b border-slate-700 cursor-pointer select-none">
                          <TableHead onClick={() => setSelectedColumnKey('date')} className={`font-extrabold text-[11px] text-white hover:bg-slate-800 ${selectedColumnKey === 'date' ? 'bg-blue-600/40' : ''}`}>Date</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('totalSales')} className={`text-right font-extrabold text-[11px] text-emerald-400 hover:bg-slate-800 ${selectedColumnKey === 'totalSales' ? 'bg-emerald-600/40' : ''}`}>Total Sales (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('cashSales')} className={`text-right font-extrabold text-[11px] text-amber-300 hover:bg-slate-800 ${selectedColumnKey === 'cashSales' ? 'bg-amber-600/40' : ''}`}>Cash Sales (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('cardSales')} className={`text-right font-extrabold text-[11px] text-blue-300 hover:bg-slate-800 ${selectedColumnKey === 'cardSales' ? 'bg-blue-600/40' : ''}`}>Card Sales (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('upi1Sales')} className={`text-right font-extrabold text-[11px] text-sky-300 hover:bg-slate-800 ${selectedColumnKey === 'upi1Sales' ? 'bg-sky-600/40' : ''}`}>UPI 1 (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('upi2Sales')} className={`text-right font-extrabold text-[11px] text-indigo-300 hover:bg-slate-800 ${selectedColumnKey === 'upi2Sales' ? 'bg-indigo-600/40' : ''}`}>UPI 2 (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('membershipSales')} className={`text-right font-extrabold text-[11px] text-purple-300 hover:bg-slate-800 ${selectedColumnKey === 'membershipSales' ? 'bg-purple-600/40' : ''}`}>Membership Sales (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('giftCardSales')} className={`text-right font-extrabold text-[11px] text-pink-300 hover:bg-slate-800 ${selectedColumnKey === 'giftCardSales' ? 'bg-pink-600/40' : ''}`}>Gift Card Sales (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('otherIncome')} className={`text-right font-extrabold text-[11px] text-cyan-300 hover:bg-slate-800 ${selectedColumnKey === 'otherIncome' ? 'bg-cyan-600/40' : ''}`}>Other Income (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('expenses')} className={`text-right font-extrabold text-[11px] text-red-400 hover:bg-slate-800 ${selectedColumnKey === 'expenses' ? 'bg-red-600/40' : ''}`}>Expenses (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('cashWithdrawn')} className={`text-right font-extrabold text-[11px] text-orange-300 hover:bg-slate-800 ${selectedColumnKey === 'cashWithdrawn' ? 'bg-orange-600/40' : ''}`}>Cash Withdrawn (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('refunds')} className={`text-right font-extrabold text-[11px] text-rose-300 hover:bg-slate-800 ${selectedColumnKey === 'refunds' ? 'bg-rose-600/40' : ''}`}>Refunds (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('openingCash')} className={`text-right font-extrabold text-[11px] text-slate-300 hover:bg-slate-800 ${selectedColumnKey === 'openingCash' ? 'bg-slate-600/40' : ''}`}>Opening Cash (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('closingCash')} className={`text-right font-extrabold text-[11px] text-amber-400 hover:bg-slate-800 ${selectedColumnKey === 'closingCash' ? 'bg-amber-600/40' : ''}`}>Closing Cash (₹)</TableHead>
                          <TableHead onClick={() => setSelectedColumnKey('status')} className={`font-extrabold text-[11px] text-white text-center hover:bg-slate-800 ${selectedColumnKey === 'status' ? 'bg-blue-600/40' : ''}`}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {singleCentreMonthly.rows.map((r) => (
                          <TableRow key={r.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'date', rowData: r }); setSelectedColumnKey('date'); }}
                              className={`font-mono text-xs font-extrabold text-slate-900 dark:text-white py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 ${selectedCell?.date === r.date && selectedCell?.colKey === 'date' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              {r.date}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'totalSales', rowData: r }); setSelectedColumnKey('totalSales'); }}
                              className={`text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 py-3 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'totalSales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-black' : 'bg-emerald-50/30 dark:bg-emerald-950/10'}`}
                            >
                              ₹{(r.financialRevenue + r.cashInOther).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'cashSales', rowData: r }); setSelectedColumnKey('cashSales'); }}
                              className={`text-right font-mono text-xs font-semibold text-amber-600 py-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'cashSales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{(r.cashSales + r.membershipCash).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'cardSales', rowData: r }); setSelectedColumnKey('cardSales'); }}
                              className={`text-right font-mono text-xs font-semibold text-blue-600 py-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'cardSales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{(r.cardSales + r.membershipCard).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'upi1Sales', rowData: r }); setSelectedColumnKey('upi1Sales'); }}
                              className={`text-right font-mono text-xs font-semibold text-sky-600 py-3 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'upi1Sales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{(r.upi1Sales || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'upi2Sales', rowData: r }); setSelectedColumnKey('upi2Sales'); }}
                              className={`text-right font-mono text-xs font-semibold text-indigo-600 py-3 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'upi2Sales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{(r.upi2Sales || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'membershipSales', rowData: r }); setSelectedColumnKey('membershipSales'); }}
                              className={`text-right font-mono text-xs font-semibold text-purple-600 py-3 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'membershipSales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{(r.membershipCash + r.membershipCard + r.membershipUpi).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'giftCardSales', rowData: r }); setSelectedColumnKey('giftCardSales'); }}
                              className={`text-right font-mono text-xs font-semibold text-pink-600 py-3 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'giftCardSales' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.giftCardSales.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'otherIncome', rowData: r }); setSelectedColumnKey('otherIncome'); }}
                              className={`text-right font-mono text-xs font-semibold text-cyan-600 py-3 cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'otherIncome' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.cashInOther.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'expenses', rowData: r }); setSelectedColumnKey('expenses'); }}
                              className={`text-right font-mono text-xs font-bold text-red-600 py-3 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'expenses' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.expenses.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'cashWithdrawn', rowData: r }); setSelectedColumnKey('cashWithdrawn'); }}
                              className={`text-right font-mono text-xs font-semibold text-orange-600 py-3 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'cashWithdrawn' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.cashHandover.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'refunds', rowData: r }); setSelectedColumnKey('refunds'); }}
                              className={`text-right font-mono text-xs font-semibold text-rose-600 py-3 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'refunds' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.refunds.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'openingCash', rowData: r }); setSelectedColumnKey('openingCash'); }}
                              className={`text-right font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 ${selectedCell?.date === r.date && selectedCell?.colKey === 'openingCash' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold' : ''}`}
                            >
                              ₹{r.openingCash.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              onClick={() => { setSelectedCell({ date: r.date, colKey: 'closingCash', rowData: r }); setSelectedColumnKey('closingCash'); }}
                              className={`text-right font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 py-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/40 ${selectedCell?.date === r.date && selectedCell?.colKey === 'closingCash' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 font-black' : 'bg-amber-50/40 dark:bg-amber-950/20'}`}
                            >
                              ₹{r.expectedClosingCash.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <Badge variant={r.isLocked ? 'emerald' : 'gold'} className="text-[10px] uppercase font-bold">
                                {r.isLocked ? 'Closed' : 'Open'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* TOTALS ROW */}
                        <TableRow className="bg-slate-900 text-white font-extrabold border-t-2 border-slate-700">
                          <TableCell className="py-3.5 text-xs font-extrabold uppercase">MONTHLY TOTALS</TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-400 py-3.5 bg-slate-800">
                            ₹{singleCentreMonthly.totals.totalSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-amber-300 py-3.5">
                            ₹{singleCentreMonthly.totals.cashSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-blue-300 py-3.5">
                            ₹{singleCentreMonthly.totals.cardSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-sky-300 py-3.5">
                            ₹{singleCentreMonthly.totals.upi1Sales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-indigo-300 py-3.5">
                            ₹{singleCentreMonthly.totals.upi2Sales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-purple-300 py-3.5">
                            ₹{singleCentreMonthly.totals.membershipSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-pink-300 py-3.5">
                            ₹{singleCentreMonthly.totals.giftCardSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-cyan-300 py-3.5">
                            ₹{singleCentreMonthly.totals.otherIncome.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-red-400 py-3.5">
                            ₹{singleCentreMonthly.totals.expenses.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-orange-300 py-3.5">
                            ₹{singleCentreMonthly.totals.cashHandover.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-rose-300 py-3.5">
                            ₹{singleCentreMonthly.totals.refunds.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-slate-300 py-3.5">
                            ₹{singleCentreMonthly.totals.openingCash.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-amber-300 py-3.5 bg-slate-800">
                            ₹{singleCentreMonthly.totals.closingCash.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="py-3.5 text-center font-mono text-[10px] text-slate-300 font-bold">
                            {singleCentreMonthly.totals.closedDaysCount}/{singleCentreMonthly.totals.totalDaysCount} Closed
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            ) : singleCentreMonthly ? (
              /* SINGLE CENTRE 15-COLUMN COMPREHENSIVE FINANCIAL STATEMENT */
              <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" /> {currentCentreObj.name} — Monthly Financial Statement ({MONTH_NAMES[selectedMonthIndex]} {selectedYear})
                  </h3>
                  <Badge variant="blue">15 Financial Statement Columns</Badge>
                </div>

                <div className="overflow-x-auto" style={{ zoom: `${sheetZoomLevel}%` }}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-900 text-white border-b border-slate-700 cursor-pointer select-none">
                        <TableHead onClick={() => setSelectedColumnKey('date')} className={`font-extrabold text-[11px] text-white hover:bg-slate-800 ${selectedColumnKey === 'date' ? 'bg-blue-600/40' : ''}`}>Date</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('totalSales')} className={`text-right font-extrabold text-[11px] text-emerald-400 hover:bg-slate-800 ${selectedColumnKey === 'totalSales' ? 'bg-emerald-600/40' : ''}`}>Total Sales (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('cashSales')} className={`text-right font-extrabold text-[11px] text-amber-300 hover:bg-slate-800 ${selectedColumnKey === 'cashSales' ? 'bg-amber-600/40' : ''}`}>Cash Sales (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('cardSales')} className={`text-right font-extrabold text-[11px] text-blue-300 hover:bg-slate-800 ${selectedColumnKey === 'cardSales' ? 'bg-blue-600/40' : ''}`}>Card Sales (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('upi1Sales')} className={`text-right font-extrabold text-[11px] text-sky-300 hover:bg-slate-800 ${selectedColumnKey === 'upi1Sales' ? 'bg-sky-600/40' : ''}`}>UPI 1 (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('upi2Sales')} className={`text-right font-extrabold text-[11px] text-indigo-300 hover:bg-slate-800 ${selectedColumnKey === 'upi2Sales' ? 'bg-indigo-600/40' : ''}`}>UPI 2 (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('membershipSales')} className={`text-right font-extrabold text-[11px] text-purple-300 hover:bg-slate-800 ${selectedColumnKey === 'membershipSales' ? 'bg-purple-600/40' : ''}`}>Membership Sales (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('giftCardSales')} className={`text-right font-extrabold text-[11px] text-pink-300 hover:bg-slate-800 ${selectedColumnKey === 'giftCardSales' ? 'bg-pink-600/40' : ''}`}>Gift Card Sales (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('otherIncome')} className={`text-right font-extrabold text-[11px] text-cyan-300 hover:bg-slate-800 ${selectedColumnKey === 'otherIncome' ? 'bg-cyan-600/40' : ''}`}>Other Income (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('expenses')} className={`text-right font-extrabold text-[11px] text-red-400 hover:bg-slate-800 ${selectedColumnKey === 'expenses' ? 'bg-red-600/40' : ''}`}>Expenses (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('cashWithdrawn')} className={`text-right font-extrabold text-[11px] text-orange-300 hover:bg-slate-800 ${selectedColumnKey === 'cashWithdrawn' ? 'bg-orange-600/40' : ''}`}>Cash Withdrawn (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('refunds')} className={`text-right font-extrabold text-[11px] text-rose-300 hover:bg-slate-800 ${selectedColumnKey === 'refunds' ? 'bg-rose-600/40' : ''}`}>Refunds (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('openingCash')} className={`text-right font-extrabold text-[11px] text-slate-300 hover:bg-slate-800 ${selectedColumnKey === 'openingCash' ? 'bg-slate-600/40' : ''}`}>Opening Cash (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('closingCash')} className={`text-right font-extrabold text-[11px] text-amber-400 hover:bg-slate-800 ${selectedColumnKey === 'closingCash' ? 'bg-amber-600/40' : ''}`}>Closing Cash (₹)</TableHead>
                        <TableHead onClick={() => setSelectedColumnKey('status')} className={`font-extrabold text-[11px] text-white text-center hover:bg-slate-800 ${selectedColumnKey === 'status' ? 'bg-blue-600/40' : ''}`}>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {singleCentreMonthly.rows.map((r) => (
                        <TableRow key={r.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <TableCell className="font-mono text-xs font-extrabold text-slate-900 dark:text-white py-3">
                            {r.date}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 py-3 bg-emerald-50/30 dark:bg-emerald-950/10">
                            ₹{(r.financialRevenue + r.cashInOther).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-amber-600 py-3">
                            ₹{(r.cashSales + r.membershipCash).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-blue-600 py-3">
                            ₹{(r.cardSales + r.membershipCard).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-sky-600 py-3">
                            ₹{(r.upi1Sales || 0).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-indigo-600 py-3">
                            ₹{(r.upi2Sales || 0).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-purple-600 py-3">
                            ₹{(r.membershipCash + r.membershipCard + r.membershipUpi).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-pink-600 py-3">
                            ₹{r.giftCardSales.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-cyan-600 py-3">
                            ₹{r.cashInOther.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-red-600 py-3">
                            ₹{r.expenses.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-orange-600 py-3">
                            ₹{r.cashHandover.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-rose-600 py-3">
                            ₹{r.refunds.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 py-3">
                            ₹{r.openingCash.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 py-3 bg-amber-50/40 dark:bg-amber-950/20">
                            ₹{r.expectedClosingCash.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge variant={r.isLocked ? 'emerald' : 'gold'} className="text-[10px] uppercase font-bold">
                              {r.isLocked ? 'Closed' : 'Open'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* TOTALS ROW */}
                      <TableRow className="bg-slate-900 text-white font-extrabold border-t-2 border-slate-700">
                        <TableCell className="py-3.5 text-xs font-extrabold uppercase">MONTHLY TOTALS</TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-400 py-3.5 bg-slate-800">
                          ₹{singleCentreMonthly.totals.totalSales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-amber-300 py-3.5">
                          ₹{singleCentreMonthly.totals.cashSales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-blue-300 py-3.5">
                          ₹{singleCentreMonthly.totals.cardSales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-sky-300 py-3.5">
                          ₹{singleCentreMonthly.totals.upi1Sales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-indigo-300 py-3.5">
                          ₹{singleCentreMonthly.totals.upi2Sales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-purple-300 py-3.5">
                          ₹{singleCentreMonthly.totals.membershipSales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-pink-300 py-3.5">
                          ₹{singleCentreMonthly.totals.giftCardSales.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-cyan-300 py-3.5">
                          ₹{singleCentreMonthly.totals.otherIncome.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-red-400 py-3.5">
                          ₹{singleCentreMonthly.totals.expenses.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-orange-300 py-3.5">
                          ₹{singleCentreMonthly.totals.cashHandover.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-rose-300 py-3.5">
                          ₹{singleCentreMonthly.totals.refunds.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-slate-300 py-3.5">
                          ₹{singleCentreMonthly.totals.openingCash.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-extrabold text-amber-300 py-3.5 bg-slate-800">
                          ₹{singleCentreMonthly.totals.closingCash.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="py-3.5 text-center font-mono text-[10px] text-slate-300 font-bold">
                          {singleCentreMonthly.totals.closedDaysCount}/{singleCentreMonthly.totals.totalDaysCount} Closed
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      {/* SUPER ADMIN REOPEN MODAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Reopen Closed Day Accounts
              </h3>
              <button onClick={() => setIsReopenModalOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                You are about to unlock financial accounts for <strong>{selectedDate}</strong> ({currentCentreObj.name}). All ledger edits will be audited.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mandatory Audit Reason</label>
                <Input
                  placeholder="State reason for reopening closed accounts..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setIsReopenModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReopenDay} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Confirm &amp; Reopen
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
