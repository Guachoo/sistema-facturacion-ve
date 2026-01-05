import { useAuth } from './use-auth';
import { hasPermission, hasAnyPermission, hasAllPermissions, type Permission } from '@/lib/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  console.log('usePermissions - Current user:', user);

  return {
    // Verificar un permiso específico
    can: (permission: Permission): boolean => {
      if (!user) {
        console.log('usePermissions - No user found');
        return false;
      }
      const result = hasPermission(user.rol, permission);
      console.log(`usePermissions - can(${permission}):`, result, 'for role:', user.rol);
      return result;
    },

    // Verificar si tiene al menos uno de los permisos
    canAny: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAnyPermission(user.rol, permissions);
    },

    // Verificar si tiene todos los permisos
    canAll: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAllPermissions(user.rol, permissions);
    },

    // Verificar si es un rol específico
    isRole: (role: string): boolean => {
      return user?.rol === role;
    },

    // Obtener el rol actual
    role: user?.rol,
  };
};
