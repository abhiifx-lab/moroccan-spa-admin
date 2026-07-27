'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Settings, ShieldCheck } from 'lucide-react';

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'manager': return 'success';
      case 'receptionist': return 'warning';
      case 'content_writer': return 'secondary';
      case 'therapist': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors focus:outline-none"
      >
        <Avatar src={user.avatarUrl} fallback={user.fullName} size="sm" />
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold leading-none">{user.fullName}</span>
          <span className="text-[10px] text-muted-foreground capitalize mt-0.5">{user.role.replace('_', ' ')}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-2 z-50 animate-in fade-in-80">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-semibold truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                <ShieldCheck className="w-3 h-3 mr-1 inline" />
                {user.role.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <button
            onClick={() => { setIsOpen(false); router.push('/admin/users'); }}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
          >
            <User className="w-4 h-4 text-muted-foreground" />
            <span>Profile Settings</span>
          </button>
          
          <button
            onClick={() => { setIsOpen(false); router.push('/admin/settings'); }}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>System Settings</span>
          </button>

          <div className="border-t border-border my-1" />

          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-500/10 text-red-500 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
