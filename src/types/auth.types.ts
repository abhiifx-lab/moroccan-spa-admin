export type UserRole = 
  | 'super_admin' 
  | 'admin'
  | 'centre_admin'
  | 'manager' 
  | 'receptionist' 
  | 'content_writer' 
  | 'therapist';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  assignedCentreId?: string | null; // null for Super Admin / Admin, 'loc_pallasio' for Moroccan Pallasio, etc.
  outletName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AdminUser | null;
  token: string | null;
  expiresAt?: number;
}

