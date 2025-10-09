import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenManager } from '@/lib/api-client';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = tokenManager.get();
    if (token) {
      // En una app real, decodificarías el token para obtener los datos del usuario
      // Por ahora, verificamos si hay una sesión válida pero sin usuario específico
      setIsAuthenticated(true);
    }
  }, []);

  const login = (userData: User, token: string) => {
    tokenManager.set(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    tokenManager.remove();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};