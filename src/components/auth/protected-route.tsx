import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  permission,
  permissions = [],
  requireAll = false,
  redirectTo = '/dashboard',
}: ProtectedRouteProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
