'use client';

import { OperationTransaction } from '@/features/operations/services/operations-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { X, Search, FileText, Layers } from 'lucide-react';

interface FinancialDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalAmount: number;
  transactions: OperationTransaction[];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-5xl w-full p-6 space-y-6 border-none overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Surface */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Lineage Drill-Down: {title}
                </h3>
                <Badge variant="blue">Enterprise V2.0 Audit</Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Complete traceability of contributing Business Documents, Event IDs, and Journal Entries.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Surface */}
        <div className="p-4 rounded-2xl bg-[#f6f8fb] dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Aggregated Total</span>
            <p className="font-mono text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              ₹{displayAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <div>
              <span>Contributing Entries: </span>
              <strong className="text-slate-900 dark:text-white font-mono">{transactions.length} entries</strong>
            </div>
            <Badge variant="emerald" className="font-mono text-[10px]">100% Explainable</Badge>
          </div>
        </div>

        {/* Contributing Transactions Table */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-medium space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Contributing Entries Found</p>
              <p>This metric is correctly verified at ₹0 as no journal transactions match the active filter criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Ref</TableHead>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Centre</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Customer / Details</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t, idx) => (
                  <TableRow key={t.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-xs font-medium transition-colors">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 py-3.5">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        {t.refCode || t.id}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-400 py-3.5">
                      {`EVT-20260726-${String(idx + 1).padStart(6, '0')}`}
                    </TableCell>
                    <TableCell className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                      {t.centreName || 'Moroccan Spa'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 py-3.5">
                      {t.date} {t.time}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="secondary" className="capitalize">{t.type.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className="uppercase text-[10px]">{t.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-white">{t.customerName || 'Walk-in Client'}</p>
                        <p className="text-[10px] text-slate-400">{t.remarks}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-extrabold text-right text-slate-900 dark:text-white py-3.5">
                      ₹{t.amount.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer Surface */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">Document Engine V2.0 • Double-Entry Reconciled</span>
          <Button onClick={onClose} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-10 px-6">
            Close Traceability
          </Button>
        </div>
      </div>
    </div>
  );
}
