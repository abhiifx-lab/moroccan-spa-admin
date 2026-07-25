'use client';

import { useAuth } from './use-auth';
import { Permission } from '@/types/rbac.types';
import { hasPermission } from '@/features/rbac/permissions';

export function useRBAC() {
  const { user } = useAuth();

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  return {
    role: user?.role || null,
    can,
    isSuperAdmin: user?.role === 'super_admin',
    isManager: user?.role === 'manager',
    isReceptionist: user?.role === 'receptionist',
    isContentWriter: user?.role === 'content_writer',
    isTherapist: user?.role === 'therapist',
  };
}
