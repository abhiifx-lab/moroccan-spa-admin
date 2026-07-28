'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 [Admin Portal Application Exception Caught by Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-xl w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Application Exception Detected</h2>
            <p className="text-xs text-rose-400 font-mono mt-0.5">Runtime Data Hygiene & Safety Shield Active</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          An unexpected data formation or rendering issue occurred while processing this administrative view. Our self-healing error boundary intercepted the exception to preserve terminal stability and session continuity.
        </p>

        {error?.message && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Exception Diagnostic</span>
            </div>
            <p className="text-xs text-rose-300 font-mono break-words">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-slate-500 font-mono">Digest ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4 animate-spin-once" />
            <span>Attempt Recovery & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
