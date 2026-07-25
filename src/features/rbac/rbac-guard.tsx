'use client';

import { ReactNode } from 'react';
import { Permission } from '@/types/rbac.types';
import { useRBAC } from '@/hooks/use-rbac';

interface RBACGuardProps {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RBACGuard({ permission, fallback = null, children }: RBACGuardProps) {
  const { can } = useRBAC();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
