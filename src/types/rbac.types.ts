import { UserRole } from './auth.types';

export type Permission =
  | 'dashboard:view'
  | 'services:read'
  | 'services:write'
  | 'locations:manage'
  | 'bookings:read'
  | 'bookings:write'
  | 'customers:read'
  | 'customers:write'
  | 'marketing:manage'
  | 'seo:manage'
  | 'analytics:view'
  | 'users:manage'
  | 'settings:manage';

export type RolePermissionsMap = Record<UserRole, Permission[]>;
