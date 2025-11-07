import { useState, useEffect, createContext, useContext } from 'react';

// FASE 8: Hook y contexto para autenticación multi-empresa
interface MultiCompanyAuth {
  id: string;
  razonSocial: string;
  rif: string;
  tipo: 'principal' | 'sucursal';
  activa: boolean;
}

interface UserCompanyPermissions {
  empresaId: string;
  empresaRif: string;
  permisos: Record<string, boolean>;
  activo: boolean;
}

interface MultiCompanyUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  empresas: UserCompanyPermissions[];
  empresaActual?: string; // ID de la empresa actualmente seleccionada
}

interface MultiCompanyAuthContext {
  user: MultiCompanyUser | null;
  currentCompany: MultiCompanyAuth | null;
  availableCompanies: MultiCompanyAuth[];
  switchCompany: (companyId: string) => void;
  hasPermission: (module: string, action: string) => boolean;
  isSuperUser: () => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Mock data para empresas
const mockCompanies: MultiCompanyAuth[] = [
  {
    id: '1',
    razonSocial: 'Corporación Principal C.A.',
    rif: 'J-12345678-9',
    tipo: 'principal',
    activa: true,
  },
  {
    id: '2',
    razonSocial: 'Sucursal Valencia C.A.',
    rif: 'J-87654321-0',
    tipo: 'sucursal',
    activa: true,
  },
  {
    id: '3',
    razonSocial: 'Filial Maracaibo S.A.',
    rif: 'J-11223344-5',
    tipo: 'sucursal',
    activa: false,
  },
];

// Mock data para usuarios con permisos multi-empresa
const mockUsers: Record<string, MultiCompanyUser> = {
  'carlos@principal.com': {
    id: '1',
    nombre: 'Carlos Admin',
    email: 'carlos@principal.com',
    rol: 'Super Admin',
    empresas: [
      {
        empresaId: '1',
        empresaRif: 'J-12345678-9',
        activo: true,
        permisos: {
          clientes_read: true,
          clientes_write: true,
          clientes_delete: true,
          facturas_read: true,
          facturas_write: true,
          facturas_delete: true,
          reportes_read: true,
          reportes_write: true,
          configuracion_read: true,
          configuracion_write: true,
          usuarios_read: true,
          usuarios_write: true,
          usuarios_delete: true,
        },
      },
      {
        empresaId: '2',
        empresaRif: 'J-87654321-0',
        activo: true,
        permisos: {
          clientes_read: true,
          clientes_write: true,
          clientes_delete: true,
          facturas_read: true,
          facturas_write: true,
          facturas_delete: true,
          reportes_read: true,
          reportes_write: true,
          configuracion_read: true,
          configuracion_write: true,
        },
      },
    ],
  },
  'maria@principal.com': {
    id: '2',
    nombre: 'María Contadora',
    email: 'maria@principal.com',
    rol: 'Contador',
    empresas: [
      {
        empresaId: '1',
        empresaRif: 'J-12345678-9',
        activo: true,
        permisos: {
          clientes_read: true,
          facturas_read: true,
          facturas_write: true,
          reportes_read: true,
          reportes_write: true,
        },
      },
    ],
  },
  'jose.valencia@principal.com': {
    id: '3',
    nombre: 'José Vendedor',
    email: 'jose.valencia@principal.com',
    rol: 'Vendedor',
    empresas: [
      {
        empresaId: '2',
        empresaRif: 'J-87654321-0',
        activo: true,
        permisos: {
          clientes_read: true,
          clientes_write: true,
          facturas_read: true,
          facturas_write: true,
          cotizaciones_read: true,
          cotizaciones_write: true,
        },
      },
    ],
  },
};

const MultiCompanyAuthContext = createContext<MultiCompanyAuthContext | undefined>(undefined);

export function useMultiCompanyAuth(): MultiCompanyAuthContext {
  const [user, setUser] = useState<MultiCompanyUser | null>(null);
  const [currentCompany, setCurrentCompany] = useState<MultiCompanyAuth | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Recuperar datos del localStorage al iniciar
  useEffect(() => {
    const savedAuth = localStorage.getItem('multiCompanyAuth');
    if (savedAuth) {
      try {
        const { user: savedUser, currentCompanyId } = JSON.parse(savedAuth);
        setUser(savedUser);
        setIsAuthenticated(true);

        // Restaurar empresa actual
        if (currentCompanyId) {
          const company = mockCompanies.find(c => c.id === currentCompanyId);
          if (company) {
            setCurrentCompany(company);
          }
        }
        // Si no hay empresa seleccionada, usar la primera disponible
        if (!currentCompanyId && savedUser?.empresas?.length > 0) {
          const firstCompanyId = savedUser.empresas[0].empresaId;
          const company = mockCompanies.find(c => c.id === firstCompanyId);
          if (company) {
            setCurrentCompany(company);
          }
        }
      } catch (error) {
        console.error('Error al recuperar autenticación:', error);
        localStorage.removeItem('multiCompanyAuth');
      }
    }
  }, []);

  // Guardar en localStorage cuando cambie el estado
  useEffect(() => {
    if (user && isAuthenticated) {
      const authData = {
        user,
        currentCompanyId: currentCompany?.id,
      };
      localStorage.setItem('multiCompanyAuth', JSON.stringify(authData));
    }
  }, [user, currentCompany, isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - en producción esto sería una llamada a la API
    const userFromMock = mockUsers[email];

    if (!userFromMock || password !== 'admin123') {
      return false;
    }

    // Filtrar empresas activas del usuario
    const activeUserCompanies = userFromMock.empresas.filter(e => {
      const company = mockCompanies.find(c => c.id === e.empresaId);
      return e.activo && company?.activa;
    });

    if (activeUserCompanies.length === 0) {
      return false; // Usuario no tiene empresas activas
    }

    const userWithActiveCompanies: MultiCompanyUser = {
      ...userFromMock,
      empresas: activeUserCompanies,
    };

    setUser(userWithActiveCompanies);
    setIsAuthenticated(true);

    // Establecer empresa por defecto (primera disponible)
    const firstCompany = mockCompanies.find(c => c.id === activeUserCompanies[0].empresaId);
    if (firstCompany) {
      setCurrentCompany(firstCompany);
    }

    return true;
  };

  const logout = () => {
    setUser(null);
    setCurrentCompany(null);
    setIsAuthenticated(false);
    localStorage.removeItem('multiCompanyAuth');
  };

  const switchCompany = (companyId: string) => {
    if (!user) return;

    // Verificar que el usuario tenga permisos para esta empresa
    const hasAccess = user.empresas.some(e => e.empresaId === companyId && e.activo);
    if (!hasAccess) {
      console.error('Usuario no tiene acceso a esta empresa');
      return;
    }

    const company = mockCompanies.find(c => c.id === companyId && c.activa);
    if (company) {
      setCurrentCompany(company);

      // Actualizar usuario con empresa actual
      setUser(prev => prev ? { ...prev, empresaActual: companyId } : null);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user || !currentCompany) return false;

    // Super admins tienen todos los permisos
    if (isSuperUser()) return true;

    // Buscar permisos específicos para la empresa actual
    const companyPermission = user.empresas.find(e => e.empresaId === currentCompany.id);
    if (!companyPermission || !companyPermission.activo) return false;

    const permissionKey = `${module}_${action}`;
    return companyPermission.permisos[permissionKey] || false;
  };

  const isSuperUser = (): boolean => {
    return user?.rol === 'Super Admin' || false;
  };

  // Empresas disponibles para el usuario actual
  const availableCompanies = user
    ? mockCompanies.filter(company =>
        company.activa &&
        user.empresas.some(e => e.empresaId === company.id && e.activo)
      )
    : [];

  return {
    user,
    currentCompany,
    availableCompanies,
    switchCompany,
    hasPermission,
    isSuperUser,
    login,
    logout,
    isAuthenticated,
  };
}

// Hook para usar el contexto
export function useMultiCompanyAuthContext() {
  const context = useContext(MultiCompanyAuthContext);
  if (context === undefined) {
    throw new Error('useMultiCompanyAuthContext must be used within a MultiCompanyAuthProvider');
  }
  return context;
}

// Tipos exportados
export type {
  MultiCompanyAuth,
  UserCompanyPermissions,
  MultiCompanyUser,
  MultiCompanyAuthContext,
};