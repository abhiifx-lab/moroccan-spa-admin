import { LucideIcon } from 'lucide-react';
import { Permission } from './rbac.types';

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  permission?: Permission;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
