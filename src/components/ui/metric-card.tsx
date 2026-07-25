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
    <Card className={cn("p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface hover:shadow-surface-lg transition-all duration-200 border-none space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{title}</span>
        {icon && <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">{value}</span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg gap-1",
              trend === 'up'
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : trend === 'down'
                ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
