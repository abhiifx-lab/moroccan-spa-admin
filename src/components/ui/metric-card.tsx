'use client';

import { ReactNode } from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  trend = 'up',
  description,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("p-6 rounded-[20px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all duration-200 space-y-4 shadow-none", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{title}</span>
        {icon && <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-blue-600 dark:text-blue-400 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">{value}</span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border gap-1",
              trend === 'up'
                ? "border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 bg-transparent"
                : trend === 'down'
                ? "border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-transparent"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-transparent"
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>

      {description && <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">{description}</p>}
    </Card>
  );
}
