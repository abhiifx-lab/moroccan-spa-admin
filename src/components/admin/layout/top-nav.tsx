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
import { Menu, Moon, Sun, Search, PanelLeftClose, PanelLeft, MapPin, Plus } from 'lucide-react';

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapsed, toggleMobileOpen } = useSidebar();
  const { centres, selectedCentreId, setSelectedCentreId, isSuperAdmin, assignedCentre } = useCentreContext();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);

  useEffect(() => {
    logAppStartupInfo(assignedCentre?.name);
  }, [assignedCentre]);

  // Helper for short display label in scope selector
  const getShortCentreLabel = (id: string) => {
    if (id === 'all') return 'All Centres';
    const c = centres.find((item) => item.id === id);
    if (!c) return 'Centre';
    if (c.name.toLowerCase().includes('lulu')) return 'Lulu Mall';
    if (c.name.toLowerCase().includes('palassio')) return 'Palassio';
    if (c.name.toLowerCase().includes('holiday')) return 'Holiday Inn';
    return c.name.replace(/Moroccan Spa - /g, '').trim();
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-200">
        <div className="w-full px-3 sm:px-6 py-2.5 sm:py-3 space-y-2.5">
          {/* Main Top Bar Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Sidebar Toggles & Breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <button
                onClick={toggleMobileOpen}
                className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={toggleCollapsed}
                className="hidden md:flex p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle sidebar"
              >
                {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>

              <div className="hidden sm:block truncate">
                <Breadcrumbs />
              </div>
            </div>

            {/* Desktop Center: Search Bar (xl screens >=1280px) */}
            <div className="hidden xl:block flex-1 max-w-md mx-4">
              <div
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-slate-500 px-3.5 py-2 rounded-lg text-xs cursor-pointer hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all"
              >
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap">Search...</span>
                <kbd className="ml-auto font-mono text-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 shrink-0">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Controls: Scope, Booking, Theme, Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Desktop Scope Selector (xl >= 1280px) */}
              <div className="hidden xl:flex items-center">
                {isSuperAdmin ? (
                  <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Scope:</span>
                    <select
                      value={selectedCentreId}
                      onChange={(e) => setSelectedCentreId(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate max-w-[130px]"
                    >
                      <option value="all">📍 All Centres</option>
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>
                          📍 {getShortCentreLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded-lg text-xs font-bold truncate max-w-[140px]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">📍 {getShortCentreLabel(assignedCentre?.id || '')}</span>
                  </div>
                )}
              </div>

              {/* Desktop New Booking Button (xl >= 1280px) */}
              <div className="hidden xl:block">
                <Button
                  size="sm"
                  onClick={() => setIsCreateBookingOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg h-9 px-3.5 shrink-0 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>New Booking</span>
                </Button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Profile Menu */}
              <ProfileMenu />
            </div>
          </div>

          {/* Sub-Row for Tablet & Mobile (< 1280px) */}
          <div className="flex xl:hidden items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/40">
            {/* Search Bar (Full available width on Tablet & Mobile) */}
            <div
              onClick={() => setIsSearchOpen(true)}
              className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-blue-500/50 min-w-0"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap truncate">Search...</span>
            </div>

            {/* Scope Selector on Tablet/Mobile */}
            {isSuperAdmin ? (
              <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 text-xs font-semibold shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <select
                  value={selectedCentreId}
                  onChange={(e) => setSelectedCentreId(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[100px] sm:max-w-[130px] truncate"
                >
                  <option value="all">📍 All</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      📍 {getShortCentreLabel(c.id)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 px-2 py-1.5 rounded-lg text-xs font-bold shrink-0 truncate max-w-[110px]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">📍 {getShortCentreLabel(assignedCentre?.id || '')}</span>
              </div>
            )}

            {/* New Booking Button on Tablet/Mobile */}
            <Button
              size="sm"
              onClick={() => setIsCreateBookingOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg h-8 px-2.5 shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">New Booking</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CreateBookingModal isOpen={isCreateBookingOpen} onClose={() => setIsCreateBookingOpen(false)} />
    </>
  );
}
