'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { APP_VERSION_CONFIG } from '@/config/app-version.config';
import { useSidebar } from '@/hooks/use-sidebar';
import { useRBAC } from '@/hooks/use-rbac';
import { useAuth } from '@/hooks/use-auth';
import { NavGroup } from '@/types/navigation.types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Gift,
  DollarSign,
  Receipt,
  TrendingDown,
  UserCheck,
  Package,
  TrendingUp,
  X,
  Lock,
  User,
  Wallet,
  ShieldCheck,
  Settings,
  History,
  UserCog,
} from 'lucide-react';

const REVISED_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { title: "Today's Bookings", href: '/admin/business/bookings', icon: Calendar, permission: 'bookings:read' },
      { title: 'Daily Closing', href: '/admin/operations/daily-closing', icon: Lock, permission: 'bookings:read' },
      { title: 'Customers', href: '/admin/business/customers', icon: Users, permission: 'customers:read' },
      { title: 'Expenses & Wages', href: '/admin/operations/expenses', icon: TrendingDown, permission: 'bookings:read' },
      { title: 'Cash Flow', href: '/admin/operations/cash-flow', icon: Wallet, permission: 'bookings:read' },
      { title: 'Memberships', href: '/admin/business/memberships', icon: CreditCard, permission: 'customers:read' },
      { title: 'Gift Vouchers', href: '/admin/business/gift-cards', icon: Gift, permission: 'customers:read' },
      { title: 'Transactions', href: '/admin/operations/transactions', icon: DollarSign, permission: 'bookings:read' },
      { title: 'Invoices', href: '/admin/operations/invoices', icon: Receipt, permission: 'bookings:read' },
    ],
  },
  {
    title: 'DIRECTORY',
    items: [
      { title: 'Therapists & Staff', href: '/admin/website/therapists', icon: UserCheck, permission: 'services:read' },
      { title: 'Spa Packages', href: '/admin/business/packages', icon: Package, permission: 'services:read' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { title: 'Reports & Growth', href: '/admin/analytics', icon: TrendingUp, permission: 'analytics:view' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { title: 'User Management', href: '/admin/users', icon: UserCog, permission: 'users:manage' },
      { title: 'Roles & Access', href: '/admin/system/roles', icon: ShieldCheck, permission: 'users:manage' },
      { title: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings:manage' },
      { title: 'Audit Trail', href: '/admin/system/audit-logs', icon: History, permission: 'settings:manage' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const { can, isSuperAdmin } = useRBAC();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Floating Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-slate-900 dark:text-slate-100 transition-all duration-300 ease-in-out md:translate-x-0 border-none shadow-[2px_0_20px_rgba(15,23,42,0.02)]",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header Branding */}
        <div className="h-20 px-4 flex items-center justify-between shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden" onClick={closeMobile}>
            <div className="shrink-0 w-10 h-10 flex items-center justify-center">
              <Image
                src="/moroccan-logo.png"
                alt="Moroccan Spa Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">MOROCCAN OS</span>
                <span suppressHydrationWarning className="text-[10px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase mt-1">
                  Enterprise Spa
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6 custom-scrollbar">
          {REVISED_NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (user?.role === 'receptionist' && (group.title === 'ANALYTICS' || group.title === 'SYSTEM')) return false;
              if (item.permission === 'settings:manage' || item.permission === 'users:manage') return isSuperAdmin;
              return !item.permission || can(item.permission);
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    {group.title}
                  </h4>
                )}
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group relative",
                        isActive
                          ? "bg-blue-600 text-white font-bold shadow-none"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {Icon && (
                        <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200")} />
                      )}
                      {!isCollapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Profile Footer */}
        {!isCollapsed && (
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Operations Admin' : 'Centre Staff'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400">
              <span>{APP_VERSION_CONFIG.version}</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{APP_VERSION_CONFIG.buildId}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
