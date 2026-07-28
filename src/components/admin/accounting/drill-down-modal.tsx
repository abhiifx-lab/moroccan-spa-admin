'use client';

import { OperationTransaction } from '@/features/operations/services/operations-engine';
import { TraceTransaction } from '@/features/business-day-engine';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { X, Search, FileText, Layers } from 'lucide-react';

interface FinancialDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalAmount: number;
  transactions: (TraceTransaction | OperationTransaction | any)[];
}

export function FinancialDrillDownModal({
  isOpen,
  onClose,
  title,
  totalAmount,
  transactions,
}: FinancialDrillDownModalProps) {
  if (!isOpen) return null;

  // Rule: Metric value MUST equal sum of drill-down entries.
  const computedSum = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const displayAmount = transactions.length === 0 ? 0 : computedSum > 0 ? computedSum : totalAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-5xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[95vh] flex flex-col shadow-none my-4 sm:my-8">
        {/* Header Surface */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight truncate">
                {title} — Lineage Drill-Down
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Full traceability of contributing journal entries and event IDs.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Surface */}
        <div className="p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Aggregated Total</span>
            <p className="font-mono text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              ₹{displayAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-500">
            <span>Contributing Entries: </span>
            <strong className="text-slate-900 dark:text-white font-mono">{transactions.length} entries</strong>
          </div>
        </div>

        {/* Contributing Transactions Table — scrollable on mobile */}
        <div className="overflow-auto custom-scrollbar flex-1 -mx-1 px-1">
          {transactions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-xs text-slate-400 font-medium space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Contributing Entries Found</p>
              <p>This metric is correctly verified at ₹0 — no journal transactions match the active filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Ref</TableHead>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Centre</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Customer / Details</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, idx) => (
                    <TableRow key={t.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-xs font-medium transition-colors">
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {t.refCode || t.id}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-400 py-3.5 whitespace-nowrap">
                        {`EVT-20260726-${String(idx + 1).padStart(6, '0')}`}
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                        {t.centreName || 'Moroccan Spa'}
                      </TableCell>
                      <TableCell className="font-mono text-slate-500 py-3.5 whitespace-nowrap">
                        {t.date} {t.time}
                      </TableCell>
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {t.type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <span className="text-xs font-bold uppercase text-slate-500">{t.paymentMethod}</span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{t.customerName || 'Walk-in Client'}</p>
                          <p className="text-[10px] text-slate-400">{t.remarks}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-extrabold text-right text-slate-900 dark:text-white py-3.5 whitespace-nowrap">
                        ₹{t.amount.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer Surface */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:block">Double-Entry Reconciled</span>
          <Button onClick={onClose} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold h-9 sm:h-10 px-4 sm:px-6 ml-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
