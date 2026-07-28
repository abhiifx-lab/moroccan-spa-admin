'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function OperationsErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 [Operations Engine Exception Intersected]:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-2xl w-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Operations Module Exception</h2>
              <p className="text-xs text-amber-400/90 font-mono mt-0.5">Reconciliation Matrix Shield & Data Safeguard Active</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Runtime Interception
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          While calculating daily register summaries or formatting currency strings from remote transaction logs, an anomalous or incomplete record was encountered. Rather than interrupting your entire admin workflow, this specific sub-engine has been paused.
        </p>

        {error?.message && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-2 font-mono">
            <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
              Diagnostic Log & Stack Context
            </div>
            <p className="text-xs text-rose-300 leading-relaxed break-all">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-slate-500">Error Digest Reference: {error.digest}</p>
            )}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
          <span>Our updated automated formatter engines automatically sanitize undefined amount parameters to preserve ledger precision upon reload.</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <Link
            href="/admin/operations"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Operations Hub</span>
          </Link>
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Module & Re-hydrate Register</span>
          </button>
        </div>
      </div>
    </div>
  );
}
