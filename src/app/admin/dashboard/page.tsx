'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useAuth } from '@/hooks/use-auth';
import { businessDayEngine, TraceTransaction } from '@/features/business-day-engine';
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
  Building2,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Receipt,
  TrendingDown,
} from 'lucide-react';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import Link from 'next/link';

export default function DashboardPage() {
  const { activeCentreFilter, isSuperAdmin, centres } = useCentreContext();
  const { user } = useAuth();

  // Dynamic States from SSOT Business Day Engine
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [centreComparisonData, setCentreComparisonData] = useState<{ id: string; name: string; revenue: number; bookings: number }[]>([]);

  // Drill-Down Modal State
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownAmount, setDrillDownAmount] = useState(0);
  const [drillDownTxns, setDrillDownTxns] = useState<TraceTransaction[]>([]);

  const loadDashboardData = async () => {
    // UNIFIED SINGLE SOURCE OF TRUTH (SSOT) METRICS FROM BUSINESS DAY ENGINE
    const ssotMetrics = await businessDayEngine.getTodayMetrics(activeCentreFilter);
    setTotalRevenue(Number(ssotMetrics?.totalRevenue || 0));
    setTotalBookingsCount(Number(ssotMetrics?.bookingsCount || 0));
    setTotalExpenses(Number(ssotMetrics?.expensesTotal || 0));
    setCashInHand(Number(ssotMetrics?.cashInHand || 0));

    await inventoryService.getLowStockAlerts(activeCentreFilter);

    const branchStats = await Promise.all(
      centres.map(async (c) => {
        const cMetrics = await businessDayEngine.getTodayMetrics(c.id);
        return {
          id: c.id,
          name: c.name,
          revenue: Number(cMetrics?.totalRevenue || 0),
          bookings: Number(cMetrics?.bookingsCount || 0),
        };
      })
    );
    setCentreComparisonData(branchStats);
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeCentreFilter, centres]);

  // LIVE SUPABASE REALTIME SUBSCRIPTION
  useRealtimeSync(loadDashboardData);

  // Drill Down Handler
  const handleOpenDrillDown = async (title: string, category: string, amount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const txns = await businessDayEngine.getTraceTransactions(activeCentreFilter, category, todayStr);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard
            title="Today Gross Revenue"
            value={`₹${Number(totalRevenue || 0).toLocaleString('en-IN')}`}
            description="New Money Inflows Only"
            icon={<DollarSign className="w-5 h-5 text-blue-600" />}
            onClick={() => handleOpenDrillDown('Today Gross Revenue', 'revenue', totalRevenue)}
          />

          <MetricCard
            title="Today Appointments"
            value={`${Number(totalBookingsCount || 0)}`}
            description="Confirmed client bookings"
            icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            onClick={() => handleOpenDrillDown('Today Appointments', 'bookings', totalBookingsCount)}
          />

          <MetricCard
            title="Expected Cash in Hand"
            value={`₹${Number(cashInHand || 0).toLocaleString('en-IN')}`}
            description="Drawer cash balance"
            icon={<Receipt className="w-5 h-5 text-purple-600" />}
            onClick={() => handleOpenDrillDown('Expected Cash in Hand', 'cashLineage', cashInHand)}
          />

          <MetricCard
            title="Today Expenses"
            value={`₹${Number(totalExpenses || 0).toLocaleString('en-IN')}`}
            description="Petty cash & utilities"
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            onClick={() => handleOpenDrillDown('Today Expenses', 'expenses', totalExpenses)}
          />
        </div>

        {/* Super Admin Comparison vs Centre User Controls */}
        {isSuperAdmin ? (
          <Card className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-none">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Spa Branch Revenue &amp; Appointments
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spa Centre Name</TableHead>
                  <TableHead>Gross Revenue (₹)</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centreComparisonData.map((branch) => (
                  <TableRow key={branch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4 whitespace-nowrap">{branch.name}</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs py-4 whitespace-nowrap">
                      ₹{Number(branch.revenue || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 py-4 whitespace-nowrap">{branch.bookings}</TableCell>
                    <TableCell className="text-right py-4">
                      <Link href="/admin/operations/daily-closing">
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold rounded-lg">
                          View Register <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-none">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Reception Quick Controls
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Link href="/admin/business/bookings">
                  <Button variant="outline" className="w-full h-24 rounded-lg flex flex-col items-center justify-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-none">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">New Appointment</span>
                  </Button>
                </Link>
                <Link href="/admin/operations/daily-closing">
                  <Button variant="outline" className="w-full h-24 rounded-lg flex flex-col items-center justify-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-none">
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
