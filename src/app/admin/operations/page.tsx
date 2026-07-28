'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calculator, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  FileText, 
  ArrowLeftRight, 
  Package, 
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useCentreContext } from '@/features/centres/context/centre-context';

interface OperationsModule {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export default function OperationsHubPage() {
  const { assignedCentre, activeCentreFilter } = useCentreContext();

  const modules: OperationsModule[] = [
    {
      title: 'Daily Closing & SSOT Register',
      description: 'Managerial financial day closure, cash drawer counts, verification checklists, and audit discrepancies.',
      href: '/admin/operations/daily-closing',
      icon: Calculator,
      badge: 'SSOT Engine',
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30 group-hover:border-amber-500',
      bgColor: 'bg-gradient-to-br from-amber-500/10 to-transparent'
    },
    {
      title: 'Cash Flow Register',
      description: 'Track real-time physical cash inflow and outflow, vault transfers, handovers, and running desk balances.',
      href: '/admin/operations/cash-flow',
      icon: DollarSign,
      badge: 'Real-time',
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30 group-hover:border-emerald-500',
      bgColor: 'bg-gradient-to-br from-emerald-500/10 to-transparent'
    },
    {
      title: 'Expense Management',
      description: 'Log daily spa expenditures, vendor payments, argan supplies, laundry costs, and staff reimbursements.',
      href: '/admin/operations/expenses',
      icon: Receipt,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/30 group-hover:border-rose-500',
      bgColor: 'bg-gradient-to-br from-rose-500/10 to-transparent'
    },
    {
      title: 'Transactions Ledger',
      description: 'Consolidated audit trails for all booking sales, membership additions, UP & card receipts, and reversals.',
      href: '/admin/operations/transactions',
      icon: ArrowLeftRight,
      badge: 'Ledger',
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30 group-hover:border-blue-500',
      bgColor: 'bg-gradient-to-br from-blue-500/10 to-transparent'
    },
    {
      title: 'Invoices & GST Billing',
      description: 'Generate, reprint, and verify customer tax invoices, GST breakdowns, and HSN compliance archives.',
      href: '/admin/operations/invoices',
      icon: FileText,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30 group-hover:border-purple-500',
      bgColor: 'bg-gradient-to-br from-purple-500/10 to-transparent'
    },
    {
      title: 'Payments & Settlement',
      description: 'Audit merchant terminal settlements across Primary Soundbox UPI, Secondary QR, and Credit card POS hardware.',
      href: '/admin/operations/payments',
      icon: CreditCard,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30 group-hover:border-cyan-500',
      bgColor: 'bg-gradient-to-br from-cyan-500/10 to-transparent'
    },
    {
      title: 'Inventory & Stock Room',
      description: 'Monitor luxury spa oils, linen consumption, retail inventory balances, and low-stock replenish alerts.',
      href: '/admin/operations/inventory',
      icon: Package,
      color: 'text-teal-400',
      borderColor: 'border-teal-500/30 group-hover:border-teal-500',
      bgColor: 'bg-gradient-to-br from-teal-500/10 to-transparent'
    },
    {
      title: 'Appointment Calendar',
      description: 'Master operational scheduling matrix for therapist room allocation and live client check-ins.',
      href: '/admin/operations/calendar',
      icon: CalendarIcon,
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/30 group-hover:border-indigo-500',
      bgColor: 'bg-gradient-to-br from-indigo-500/10 to-transparent'
    }
  ];

  return (
    <div className="min-h-screen p-6 sm:p-8 text-slate-100 bg-slate-950 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Moroccan Spa Admin Hub</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Operations Command Center
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">
            Select an operational sub-engine to monitor physical cash registers, execute daily managerial reconciliations, or inspect transactional audit logs for <span className="text-white font-medium">{assignedCentre?.name || 'All Consolidated Centres'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-sm">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Active Centre: <strong className="text-emerald-400 font-mono">{activeCentreFilter || 'CONSOLIDATED'}</strong></span>
        </div>
      </div>

      {/* Grid Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:gap-6 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group outline-none">
              <div className={`relative h-full flex flex-col justify-between p-6 rounded-2xl border bg-slate-900/80 backdrop-blur transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-xl ${mod.borderColor} ${mod.bgColor}`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-slate-950/80 border border-slate-800 ${mod.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {mod.badge && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors flex items-center justify-between">
                    <span>{mod.title}</span>
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                  <span>Open Engine</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer / Guidance Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-white">Need automated compliance reports?</h3>
            <p className="text-xs text-slate-400">All transactions recorded through these operational tools feed directly into the general accounting matrix and daily closing single-source-of-truth tables.</p>
          </div>
        </div>
        <Link href="/admin/accounting" className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all shrink-0 border border-slate-700">
          View Accounting Suite →
        </Link>
      </div>
    </div>
  );
}
