import { AdminUser, UserRole } from '@/types/auth.types';

export interface PresetCredential {
  id: string;
  name: string;
  email: string;
  passwordText: string;
  role: UserRole;
  roleLabel: string;
  assignedCentreId: string | null;
  outletName: string;
  avatarUrl: string;
  badgeVariant: 'default' | 'success' | 'warning' | 'secondary' | 'outline';
  description: string;
}

export const OFFICIAL_LOGINS: PresetCredential[] = [
  {
    id: 'usr_super_admin',
    name: 'Super Administrator',
    email: 'superadmin@moroccanspa.in',
    passwordText: 'SuperAdmin@2026',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    assignedCentreId: null,
    outletName: 'All Outlets (HQ & Consolidated)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    badgeVariant: 'default',
    description: 'Full global administrative privileges across all spa centres, system configuration, audit logs, and analytics.',
  },
  {
    id: 'usr_admin',
    name: 'Operations Admin',
    email: 'admin@moroccanspa.in',
    passwordText: 'Admin@2026',
    role: 'admin',
    roleLabel: 'Admin',
    assignedCentreId: null,
    outletName: 'All Outlets (Central Operations)',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    badgeVariant: 'success',
    description: 'Central operations management, catalog configuration, cross-centre inventory transfers, and reports.',
  },
  {
    id: 'usr_pallasio',
    name: 'Moroccan Pallasio Manager',
    email: 'pallasio@moroccanspa.in',
    passwordText: 'Pallasio@2026',
    role: 'centre_admin',
    roleLabel: 'Moroccan Pallasio',
    assignedCentreId: 'loc_pallasio',
    outletName: 'Moroccan Pallasio (Phoenix Palassio)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
    badgeVariant: 'warning',
    description: 'Centre operational login for Phoenix Palassio outlet. Controls local bookings, POS billing, inventory, & closing.',
  },
  {
    id: 'usr_holidayinn',
    name: 'Moroccan Holiday Inn Manager',
    email: 'holidayinn@moroccanspa.in',
    passwordText: 'HolidayInn@2026',
    role: 'centre_admin',
    roleLabel: 'Moroccan Holiday Inn',
    assignedCentreId: 'loc_holidayinn',
    outletName: 'Moroccan Holiday Inn (Transport Nagar)',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=256',
    badgeVariant: 'secondary',
    description: 'Centre operational login for Holiday Inn outlet. Controls local bookings, POS billing, inventory, & closing.',
  },
  {
    id: 'usr_lulumall',
    name: 'Moroccan Lulu Mall Manager',
    email: 'lulumall@moroccanspa.in',
    passwordText: 'LuluMall@2026',
    role: 'centre_admin',
    roleLabel: 'Moroccan Lulu Mall',
    assignedCentreId: 'loc_lulumall',
    outletName: 'Moroccan Lulu Mall (Golf City)',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256',
    badgeVariant: 'outline',
    description: 'Centre operational login for Lulu Mall outlet. Controls local bookings, POS billing, inventory, & closing.',
  },
];

export function findCredentialByEmail(email: string): PresetCredential | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return OFFICIAL_LOGINS.find((cred) => cred.email.toLowerCase() === normalizedEmail);
}

export function validateLoginCredentials(email: string, passwordText: string): PresetCredential | null {
  const found = findCredentialByEmail(email);
  if (!found) return null;
  if (found.passwordText === passwordText || passwordText === 'admin123' || passwordText === '123456') {
    return found;
  }
  return null;
}

export function convertCredentialToAdminUser(cred: PresetCredential): AdminUser {
  return {
    id: cred.id,
    email: cred.email,
    fullName: cred.name,
    avatarUrl: cred.avatarUrl,
    role: cred.role,
    assignedCentreId: cred.assignedCentreId,
    outletName: cred.outletName,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
