import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../lib/api/client';

interface Admin {
  id: string;
  email: string;
  role: string;
  status?: string;
}

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  login: (token: string, adminData: Admin) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await fetchApi<Admin>('/admin/auth/me');
          setAdmin(res);
        } catch (err) {
          localStorage.removeItem('access_token');
          setAdmin(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string, adminData: Admin) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('admin_data', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
