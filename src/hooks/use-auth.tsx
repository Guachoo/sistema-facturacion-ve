import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenManager, userManager } from '@/lib/api-client';
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
    const savedUser = userManager.get();

    if (token && savedUser) {
      // ✅ SOLUCIONADO: Restaurar tanto token como datos de usuario
      setUser(savedUser);
      setIsAuthenticated(true);
      console.log('🔄 Sesión restaurada:', savedUser.nombre);
    } else if (token && !savedUser) {
      // Si hay token pero no datos de usuario, limpiar sesión
      console.log('⚠️ Token sin datos de usuario, limpiando sesión');
      tokenManager.remove();
      setIsAuthenticated(false);
    }
  }, []);

  const login = (userData: User, token: string) => {
    tokenManager.set(token);
    userManager.set(userData); // ✅ NUEVO: Guardar datos de usuario
    setUser(userData);
    setIsAuthenticated(true);
    console.log('✅ Login exitoso:', userData.nombre);
  };

  const logout = () => {
    tokenManager.remove(); // Esto ya limpia tanto token como user data
    userManager.remove(); // ✅ Limpieza explícita adicional
    setUser(null);
    setIsAuthenticated(false);
    console.log('👋 Logout exitoso');
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