import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'support' | 'user';

interface AuthContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAdmin: boolean;
  canTimbrar: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Por defecto, el usuario es 'admin' para desarrollo
  // En producción esto vendría de tu sistema de autenticación
  const [userRole, setUserRole] = useState<UserRole>('admin');

  const isAdmin = userRole === 'admin';
  const canTimbrar = userRole === 'admin' || userRole === 'support';

  return (
    <AuthContext.Provider value={{ userRole, setUserRole, isAdmin, canTimbrar }}>
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
