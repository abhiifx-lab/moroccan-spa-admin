'use client';

import { ReactNode, useEffect } from 'react';
import { useSidebar } from '@/hooks/use-sidebar';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';
import { CentreProvider } from '@/features/centres/context/centre-context';
import { cn } from '@/lib/utils';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  // Purge legacy browser localStorage keys on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const legacyKeys = [
        'admin_bookings_v1', 'admin_bookings_v2',
        'admin_customers_v1', 'admin_global_customers_v1', 'admin_global_customers_v2',
        'admin_sales_ledger_v1', 'admin_sales_v1',
        'admin_inventory_v1', 'admin_inventory_v2', 'admin_inventory_transfers_v1', 'admin_inventory_transfers_v2',
        'admin_expenses_v1', 'admin_expenses_v2',
        'admin_audit_logs_v1', 'admin_audit_logs_v2',
        'admin_notifications_v1', 'admin_notifications_v2',
        'admin_daily_closings_v1', 'admin_daily_closings_v2',
        'admin_master_daily_ledgers_v1', 'admin_master_daily_ledgers_v2',
      ];

      legacyKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
      });
    }
  }, []);

  return (
    <CentreProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Workspace */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out",
            isCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          <TopNav />
          <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6 pb-8">
            {children}
          </main>
        </div>
      </div>
    </CentreProvider>
  );
}
