import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUserPermissions } from '@/api/users';

// Types
export type ModuleType = 'clientes' | 'items' | 'facturas' | 'reportes' | 'configuracion' | 'usuarios';
export type ActionType = 'leer' | 'escribir' | 'eliminar';

interface PermissionsContextType {
  canAccess: (module: ModuleType, action?: ActionType) => boolean;
  canRead: (module: ModuleType) => boolean;
  canWrite: (module: ModuleType) => boolean;
  canDelete: (module: ModuleType) => boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  userRole: string;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data: permissions = [], isLoading } = useUserPermissions(user?.id || '');

  // Check if user is superadmin (full access)
  const isSuperAdmin = user?.rol === 'superadmin';

  // Helper function to check specific permission
  const canAccess = (module: ModuleType, action: ActionType = 'leer'): boolean => {
    // Superadmin has access to everything
    if (isSuperAdmin) return true;

    // No user logged in
    if (!user) return false;

    // Find permission for the module
    const modulePermission = permissions.find(p => p.modulo === module);

    if (!modulePermission) return false;

    // Check specific action
    switch (action) {
      case 'leer':
        return modulePermission.puede_leer;
      case 'escribir':
        return modulePermission.puede_escribir;
      case 'eliminar':
        return modulePermission.puede_eliminar;
      default:
        return false;
    }
  };

  // Convenience methods
  const canRead = (module: ModuleType) => canAccess(module, 'leer');
  const canWrite = (module: ModuleType) => canAccess(module, 'escribir');
  const canDelete = (module: ModuleType) => canAccess(module, 'eliminar');

  const value = {
    canAccess,
    canRead,
    canWrite,
    canDelete,
    isLoading,
    isSuperAdmin,
    userRole: user?.rol || ''
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// HOC to protect components based on permissions
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  requiredModule: ModuleType,
  requiredAction: ActionType = 'leer'
) => {
  return (props: P) => {
    const { canAccess } = usePermissions();

    if (!canAccess(requiredModule, requiredAction)) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <div className="text-center space-y-2">
            <div className="text-lg font-medium text-muted-foreground">
              Acceso Restringido
            </div>
            <div className="text-sm text-muted-foreground">
              No tienes permisos para {requiredAction} en el módulo de {requiredModule}
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook to check if user can access a route
export const useRoutePermission = (module: ModuleType, action: ActionType = 'leer') => {
  const { canAccess, isLoading } = usePermissions();

  return {
    canAccess: canAccess(module, action),
    isLoading
  };
};

// Utility to get user role display name
export const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    contador: 'Contador',
    vendedor: 'Vendedor',
    supervisor: 'Supervisor',
    auditor: 'Auditor'
  };

  return roleNames[role] || role;
};

// Utility to get available modules for a role
export const getModulesForRole = (role: string): ModuleType[] => {
  const modulesByRole: Record<string, ModuleType[]> = {
    superadmin: ['clientes', 'items', 'facturas', 'reportes', 'configuracion', 'usuarios'],
    admin: ['clientes', 'items', 'facturas', 'reportes', 'configuracion', 'usuarios'],
    contador: ['clientes', 'items', 'facturas', 'reportes'],
    vendedor: ['clientes', 'items', 'facturas'],
    supervisor: ['clientes', 'items', 'facturas', 'reportes'],
    auditor: ['reportes']
  };

  return modulesByRole[role] || [];
};

// Utility to get default permissions for a role
export const getDefaultPermissionsForRole = (role: string): Record<ModuleType, { leer: boolean; escribir: boolean; eliminar: boolean }> => {
  const defaultPermissions: Record<string, Record<ModuleType, { leer: boolean; escribir: boolean; eliminar: boolean }>> = {
    superadmin: {
      clientes: { leer: true, escribir: true, eliminar: true },
      items: { leer: true, escribir: true, eliminar: true },
      facturas: { leer: true, escribir: true, eliminar: true },
      reportes: { leer: true, escribir: true, eliminar: true },
      configuracion: { leer: true, escribir: true, eliminar: true },
      usuarios: { leer: true, escribir: true, eliminar: true }
    },
    admin: {
      clientes: { leer: true, escribir: true, eliminar: true },
      items: { leer: true, escribir: true, eliminar: true },
      facturas: { leer: true, escribir: true, eliminar: false },
      reportes: { leer: true, escribir: false, eliminar: false },
      configuracion: { leer: true, escribir: true, eliminar: false },
      usuarios: { leer: true, escribir: true, eliminar: false }
    },
    contador: {
      clientes: { leer: true, escribir: true, eliminar: false },
      items: { leer: true, escribir: true, eliminar: false },
      facturas: { leer: true, escribir: true, eliminar: false },
      reportes: { leer: true, escribir: false, eliminar: false },
      configuracion: { leer: false, escribir: false, eliminar: false },
      usuarios: { leer: false, escribir: false, eliminar: false }
    },
    vendedor: {
      clientes: { leer: true, escribir: true, eliminar: false },
      items: { leer: true, escribir: false, eliminar: false },
      facturas: { leer: true, escribir: true, eliminar: false },
      reportes: { leer: false, escribir: false, eliminar: false },
      configuracion: { leer: false, escribir: false, eliminar: false },
      usuarios: { leer: false, escribir: false, eliminar: false }
    },
    supervisor: {
      clientes: { leer: true, escribir: true, eliminar: false },
      items: { leer: true, escribir: true, eliminar: false },
      facturas: { leer: true, escribir: true, eliminar: false },
      reportes: { leer: true, escribir: false, eliminar: false },
      configuracion: { leer: false, escribir: false, eliminar: false },
      usuarios: { leer: false, escribir: false, eliminar: false }
    },
    auditor: {
      clientes: { leer: false, escribir: false, eliminar: false },
      items: { leer: false, escribir: false, eliminar: false },
      facturas: { leer: false, escribir: false, eliminar: false },
      reportes: { leer: true, escribir: false, eliminar: false },
      configuracion: { leer: false, escribir: false, eliminar: false },
      usuarios: { leer: false, escribir: false, eliminar: false }
    }
  };

  return defaultPermissions[role] || {};
};