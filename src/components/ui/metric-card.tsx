'use client';

import { ReactNode } from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  className,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80',
        'hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:shadow-md dark:hover:shadow-slate-950/40 transition-all duration-200',
        'cursor-pointer h-full flex flex-col justify-between space-y-4 select-none',
        className
      )}
    >
      {/* Top Row: Icon + Metric Title + Arrow Action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 shrink-0">
              {icon}
            </div>
          )}
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight truncate">
            {title}
          </span>
        </div>

        {/* Hover Arrow Indicator */}
        <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0 pt-1">
          <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
            Details
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Middle: Large Metric Value */}
      <div className="py-1">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight block truncate">
          {value}
        </span>
      </div>

      {/* Bottom: Short Description */}
      {description && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 font-medium truncate">
            {description}
          </p>
        </div>
      )}
    </Card>
  );
}
