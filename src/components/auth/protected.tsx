import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import type { Permission } from '@/lib/permissions';

interface ProtectedProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // Si true, requiere TODOS los permisos, si false requiere AL MENOS UNO
  fallback?: ReactNode;
  showMessage?: boolean; // Mostrar mensaje de acceso denegado
}

export function Protected({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  showMessage = true,
}: ProtectedProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = true;

  // Verificar permiso único
  if (permission) {
    hasAccess = can(permission);
  }
  // Verificar múltiples permisos
  else if (permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  // Si tiene acceso, mostrar el contenido
  if (hasAccess) {
    return <>{children}</>;
  }

  // Si no tiene acceso y hay fallback, mostrarlo
  if (fallback) {
    return <>{fallback}</>;
  }

  // Si no tiene acceso y showMessage es true, mostrar mensaje
  if (showMessage) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tienes permisos suficientes para acceder a esta funcionalidad.
          Contacta al administrador si necesitas acceso.
        </AlertDescription>
      </Alert>
    );
  }

  // Si no tiene acceso y no debe mostrar nada, retornar null
  return null;
}

// Componente para ocultar elementos sin mostrar mensaje
export function ProtectedHidden({ children, permission, permissions, requireAll }: Omit<ProtectedProps, 'fallback' | 'showMessage'>) {
  return (
    <Protected
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      showMessage={false}
    >
      {children}
    </Protected>
  );
}
