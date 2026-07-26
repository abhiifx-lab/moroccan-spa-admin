'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Settings, ShieldCheck, CircleUserRound } from 'lucide-react';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Profile menu"
      >
        {/* Simple profile icon — no avatar image */}
        <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
          <CircleUserRound className="w-5 h-5" />
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold leading-none text-slate-900 dark:text-white">{user.fullName}</span>
          <span className="text-[10px] text-slate-400 capitalize mt-0.5">{user.role.replace('_', ' ')}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1.5 z-50 animate-in fade-in-80">
          {/* User info header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <div className="flex items-center gap-2 mb-1">
              <CircleUserRound className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.fullName}</p>
            </div>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <button
            onClick={() => { setIsOpen(false); router.push('/admin/users'); }}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Profile Settings</span>
          </button>

          <button
            onClick={() => { setIsOpen(false); router.push('/admin/settings'); }}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>System Settings</span>
          </button>

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
