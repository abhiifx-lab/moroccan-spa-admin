'use client';

import { useState, useEffect } from 'react';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { businessDayEngine } from '@/features/business-day-engine';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';

export default function AnalyticsPage() {
  const { activeCentreFilter } = useCentreContext();
  const [reportData, setReportData] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });

  useEffect(() => {
    async function loadReports() {
      const data = await businessDayEngine.getFinancialReports(activeCentreFilter);
      setReportData(data);
    }
    loadReports();
  }, [activeCentreFilter]);

  return (
    <PageShell
      title="Business Analytics & Profit-Loss Reports"
      description="Live P&L statement, gross income, operating expenses, and net profit derived from the Single Source of Truth Accounting Engine."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Gross Income</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              ₹{reportData.totalIncome.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-600 font-medium">Aggregated Service &amp; Product Revenue</p>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Operating Expenses</span>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-extrabold text-red-600 font-mono">
              ₹{reportData.totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-red-500 font-medium">Payroll, Utilities &amp; Consumables</p>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Net Profit (P&amp;L)</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div className={`text-3xl font-extrabold font-mono ${reportData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              ₹{reportData.netProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 font-medium">Net Income after all deductions</p>
          </Card>

          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>GL Postings Count</span>
              <Receipt className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {reportData.transactionCount}
            </div>
            <p className="text-xs text-slate-500 font-medium">Immutable General Ledger postings</p>
          </Card>
        </div>

        <Card className="p-8 text-center space-y-3 bg-white dark:bg-[#141c2e] rounded-[20px] shadow-surface border-none">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 w-12 h-12 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Single Source of Truth Accounting System Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All analytics metrics and Profit-Loss statements stream directly from General Ledger transactions.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
