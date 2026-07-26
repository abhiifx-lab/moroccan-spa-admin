'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AdminUser } from '@/types/auth.types';
import { OFFICIAL_LOGINS, convertCredentialToAdminUser, findCredentialByEmail, validateLoginCredentials } from '@/lib/auth-credentials';

const DEFAULT_SUPER_ADMIN = convertCredentialToAdminUser(OFFICIAL_LOGINS[0]);

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(DEFAULT_SUPER_ADMIN);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(DEFAULT_SUPER_ADMIN);
      }
    } else {
      setUser(DEFAULT_SUPER_ADMIN);
      localStorage.setItem('admin_user', JSON.stringify(DEFAULT_SUPER_ADMIN));
    }
  }, []);

  const login = async (email: string, password?: string, roleOverride?: string) => {
    setIsLoading(true);
    
    // Check if matching preset credential exists
    const preset = password 
      ? validateLoginCredentials(email, password) || findCredentialByEmail(email)
      : findCredentialByEmail(email);

    let loggedInUser: AdminUser;

    if (preset) {
      loggedInUser = convertCredentialToAdminUser(preset);
      if (roleOverride) {
        loggedInUser.role = roleOverride as AdminUser['role'];
      }
    } else {
      const fallbackRole = (roleOverride || 'super_admin') as AdminUser['role'];
      loggedInUser = {
        id: `usr_${Date.now()}`,
        email,
        fullName: email.split('@')[0].toUpperCase(),
        role: fallbackRole,
        assignedCentreId: fallbackRole === 'super_admin' || fallbackRole === 'admin' ? null : 'loc_pallasio',
        outletName: fallbackRole === 'super_admin' || fallbackRole === 'admin' ? 'All Outlets' : 'Moroccan Pallasio',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    setUser(loggedInUser);
    localStorage.setItem('admin_user', JSON.stringify(loggedInUser));
    document.cookie = 'admin_session=true; path=/; max-age=604800; SameSite=Lax';
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    setUser(null);
    localStorage.removeItem('admin_user');
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
