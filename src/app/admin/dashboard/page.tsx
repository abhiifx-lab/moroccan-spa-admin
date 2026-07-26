'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useAuth } from '@/hooks/use-auth';
import { operationsEngine, OperationTransaction } from '@/features/operations/services/operations-engine';
import { customerService } from '@/features/customers/services/customer-service';
import { inventoryService } from '@/features/inventory/services/inventory-service';
import { FinancialDrillDownModal } from '@/components/admin/accounting/drill-down-modal';
import { PageShell } from '@/components/admin/layout/page-shell';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Calendar,
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  PackageCheck,
  CheckCircle2,
  Receipt,
  TrendingDown,
} from 'lucide-react';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { domainQueryLayer } from '@/features/domain-queries/domain-query-layer';
import Link from 'next/link';

export default function DashboardPage() {
  const { activeCentreFilter, isSuperAdmin, selectedCentreId, assignedCentre, centres } = useCentreContext();
  const { user } = useAuth();
  const selectedCentreObj = centres.find((c) => c.id === activeCentreFilter);

  // Dynamic States from SSOT Domain Query Layer
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [membershipRedemptionsVal, setMembershipRedemptionsVal] = useState(0);
  const [giftCardRedemptionsVal, setGiftCardRedemptionsVal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [centreComparisonData, setCentreComparisonData] = useState<{ id: string; name: string; revenue: number; bookings: number }[]>([]);

  // Drill-Down Modal State
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownAmount, setDrillDownAmount] = useState(0);
  const [drillDownTxns, setDrillDownTxns] = useState<OperationTransaction[]>([]);

  const loadDashboardData = async () => {
    // UNIFIED SINGLE SOURCE OF TRUTH (SSOT) METRICS FROM DOMAIN QUERY LAYER
    const data = await domainQueryLayer.getDashboardMetrics(activeCentreFilter);
    setTotalRevenue(data.totalRevenue);
    setTotalBookingsCount(data.bookingsCount);
    setTotalExpenses(data.expensesTotal);
    setCashInHand(data.cashInHand);
    setMembershipRedemptionsVal(data.membershipRedemptionsValue);
    setGiftCardRedemptionsVal(data.giftCardRedemptionsValue);

    const lowStock = await inventoryService.getLowStockAlerts(activeCentreFilter);
    setLowStockCount(lowStock.length);

    setCentreComparisonData(
      data.cashBreakdown.map((c) => ({
        id: c.centreId,
        name: c.centreName,
        revenue: c.revenue,
        bookings: c.bookingsCount,
      }))
    );
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeCentreFilter, centres]);

  // LIVE SUPABASE REALTIME SUBSCRIPTION
  useRealtimeSync(loadDashboardData);

  // Drill Down Handler
  const handleOpenDrillDown = (title: string, category: string, amount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const txns = operationsEngine.getFilteredTransactions(activeCentreFilter, category, todayStr);
    setDrillDownTitle(title);
    setDrillDownAmount(amount);
    setDrillDownTxns(txns);
    setDrillDownModalOpen(true);
  };

  return (
    <PageShell
      title={`Good Morning, ${user?.fullName || 'Administrator'}`}
      description={
        isSuperAdmin
          ? 'Consolidated operational intelligence derived live from Supabase. Click any figure for drill-down details.'
          : 'Daily appointment bookings, sales ledger, customer CRM, and live cash balances.'
      }
    >
      <div className="space-y-8">
        {/* Floating Metric Surfaces Grid (Interactive Clickable Drill-Down Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div onClick={() => handleOpenDrillDown('Today Gross Revenue', 'revenue', totalRevenue)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <MetricCard
              title="Today Gross Revenue"
              value={`₹${totalRevenue.toLocaleString('en-IN')}`}
              change="Click to Drill Down"
              trend="neutral"
              description="New Money Inflows Only"
              icon={<DollarSign className="w-5 h-5 text-blue-600" />}
            />
          </div>

          <div onClick={() => handleOpenDrillDown('Today Appointments', 'bookings', totalBookingsCount)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <MetricCard
              title="Today Appointments"
              value={`${totalBookingsCount}`}
              change="Click to Drill Down"
              trend="neutral"
              description="Confirmed client bookings"
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            />
          </div>

          <div onClick={() => handleOpenDrillDown('Expected Cash in Hand', 'cashSales', cashInHand)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <MetricCard
              title="Expected Cash in Hand"
              value={`₹${cashInHand.toLocaleString('en-IN')}`}
              change="Click to Drill Down"
              trend="neutral"
              description="Drawer cash balance"
              icon={<Receipt className="w-5 h-5 text-purple-600" />}
            />
          </div>

          <div onClick={() => handleOpenDrillDown('Today Expenses', 'expenses', totalExpenses)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <MetricCard
              title="Today Expenses"
              value={`₹${totalExpenses.toLocaleString('en-IN')}`}
              change="Click to Drill Down"
              trend="down"
              description="Petty cash & utilities"
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            />
          </div>
        </div>

        {/* OPERATIONAL REDEMPTIONS SUMMARY (Excluded from Revenue Totals) */}
        <Card className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">Prepaid Stored Balance Usage (Operational Only)</span>
                <Badge variant="secondary">Zero New Revenue Impact</Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Services delivered via prepaid Memberships &amp; Gift Cards. Revenue was recognized when sold.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono shrink-0 text-xs">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-sans block">Membership Redeemed</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400">₹{membershipRedemptionsVal.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-sans block">Gift Cards Redeemed</span>
              <span className="font-extrabold text-purple-600 dark:text-purple-400">₹{giftCardRedemptionsVal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>

        {/* Super Admin Comparison vs Centre User Controls */}
        {isSuperAdmin ? (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Spa Branch Revenue &amp; Appointment Comparison
              </CardTitle>
              <Badge variant="blue">SSOT Accounting Stream</Badge>
            </CardHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spa Centre Name</TableHead>
                  <TableHead>Gross Revenue (₹)</TableHead>
                  <TableHead>Bookings Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centreComparisonData.map((branch) => (
                  <TableRow key={branch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4">{branch.name}</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs py-4">
                      ₹{branch.revenue.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 py-4">{branch.bookings} bookings</TableCell>
                    <TableCell className="py-4"><Badge variant="emerald">Operational</Badge></TableCell>
                    <TableCell className="text-right py-4">
                      <Link href="/admin/operations/daily-closing">
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold rounded-xl">
                          View Register <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Reception Quick Controls
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Link href="/admin/business/bookings">
                  <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs bg-[#f6f8fb] dark:bg-slate-800/80 border-none hover:bg-white dark:hover:bg-slate-800 shadow-xs transition-all">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">New Appointment</span>
                  </Button>
                </Link>
                <Link href="/admin/operations/daily-closing">
                  <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs bg-[#f6f8fb] dark:bg-slate-800/80 border-none hover:bg-white dark:hover:bg-slate-800 shadow-xs transition-all">
                    <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Daily Closing</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>

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
