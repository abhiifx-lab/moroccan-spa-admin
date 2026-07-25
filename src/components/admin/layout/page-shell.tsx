import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PageShellProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export function PageShell({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: PageShellProps) {
  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {description}
          </p>
        </div>
        {actionLabel && (
          <Button onClick={onAction} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-4">
            <Plus className="w-4 h-4 mr-1.5" />
            {actionLabel}
          </Button>
        )}
      </div>
      <div className="space-y-8">{children}</div>
    </div>
  );
}
