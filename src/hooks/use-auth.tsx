'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AdminUser } from '@/types/auth.types';
import { MOCK_ADMIN_USER } from '@/lib/constants';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(MOCK_ADMIN_USER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(MOCK_ADMIN_USER);
      }
    } else {
      setUser(MOCK_ADMIN_USER);
      localStorage.setItem('admin_user', JSON.stringify(MOCK_ADMIN_USER));
    }
  }, []);

  const login = async (email: string, role = 'super_admin') => {
    setIsLoading(true);
    const loggedInUser: AdminUser = {
      ...MOCK_ADMIN_USER,
      email,
      role: role as AdminUser['role'],
    };
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
