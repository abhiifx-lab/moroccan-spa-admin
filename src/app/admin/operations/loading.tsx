'use client';

import React from 'react';
import { Loader2, ShieldCheck, Activity } from 'lucide-react';

export default function OperationsLoadingState() {
  return (
    <div className="min-h-[75vh] w-full flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100 space-y-6">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
      </div>

      <div className="text-center max-w-sm space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-semibold text-amber-500">
          <ShieldCheck className="w-4 h-4" />
          <span>Moroccan Spa Admin Engine</span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">
          Hydrating Operations Ledger...
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Verifying cash register single source of truth and resolving daily transaction reconciliations securely.
        </p>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div className="w-1/2 h-4 bg-slate-800 rounded" />
          <div className="w-3/4 h-6 bg-slate-700/50 rounded" />
        </div>
        <div className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div className="w-1/2 h-4 bg-slate-800 rounded" />
          <div className="w-3/4 h-6 bg-slate-700/50 rounded" />
        </div>
        <div className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div className="w-1/2 h-4 bg-slate-800 rounded" />
          <div className="w-3/4 h-6 bg-slate-700/50 rounded" />
        </div>
      </div>
    </div>
  );
}
