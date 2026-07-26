'use client';

import { useEffect, useState } from 'react';
import { logAppStartupInfo } from '@/config/app-version.config';
import { useTheme } from '@/components/providers/theme-provider';
import { useSidebar } from '@/hooks/use-sidebar';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { GlobalSearchModal } from './global-search-modal';
import { CreateBookingModal } from '../bookings/create-booking-modal';
import { ProfileMenu } from './profile-menu';
import { Breadcrumbs } from './breadcrumbs';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun, Search, PanelLeftClose, PanelLeft, Building2, MapPin, Plus } from 'lucide-react';

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapsed, toggleMobileOpen } = useSidebar();
  const { centres, selectedCentreId, setSelectedCentreId, isSuperAdmin, assignedCentre } = useCentreContext();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);

  useEffect(() => {
    logAppStartupInfo(assignedCentre?.name);
  }, [assignedCentre]);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 sm:h-20 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 py-2.5 sm:py-4 border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Left section: Sidebar toggle & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={toggleMobileOpen}
            className="md:hidden p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={toggleCollapsed}
            className="hidden md:flex p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Clean Outlined Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 px-4 py-2.5 rounded-lg text-xs cursor-pointer hover:border-blue-500/40 transition-all"
          >
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-medium text-slate-400 dark:text-slate-400">Search appointments, clients, services...</span>
            <kbd className="ml-auto font-mono text-[10px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">⌘K</kbd>
          </div>
        </div>

        {/* Centre Selector & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 sm:gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs max-w-[150px] sm:max-w-none">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-wider hidden sm:inline">Scope:</span>
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate max-w-[100px] sm:max-w-none"
              >
                <option value="all">All Spa Centres</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold truncate max-w-[140px] sm:max-w-none">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{assignedCentre?.name || 'Lucknow Spa Center'}</span>
            </div>
          )}

          {/* Quick Create Action Button */}
          <Button
            size="sm"
            onClick={() => setIsCreateBookingOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg h-9 sm:h-10 px-3 sm:px-4 shrink-0 shadow-none"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">New Booking</span>
          </Button>

          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <ProfileMenu />
        </div>
      </header>

      {/* Global Modals */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CreateBookingModal isOpen={isCreateBookingOpen} onClose={() => setIsCreateBookingOpen(false)} />
    </>
  );
}
