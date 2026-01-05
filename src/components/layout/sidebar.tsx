import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  Users2,
  Anchor
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/permissions';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  permission?: Permission;
  permissions?: Permission[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Principal',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'view_dashboard'
  },
  {
    name: 'Facturas',
    href: '/facturas',
    icon: FileText,
    permission: 'view_invoices'
  },
  {
    name: 'Clientes',
    href: '/clientes',
    icon: Users,
    permission: 'view_customers'
  },
  {
    name: 'Productos/Servicios',
    href: '/items',
    icon: Package,
    permission: 'view_items'
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    permission: 'view_reports'
  },
  {
    name: 'Trámites',
    href: '/tramites',
    icon: Anchor,
    permission: 'view_tramites'
  },
  {
    name: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    permission: 'view_settings'
  },
];

const adminNavigation: NavigationItem[] = [
  {
    name: 'Usuarios',
    href: '/usuarios',
    icon: Users2,
    permission: 'manage_users'
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    console.log('🚀 CLICK DETECTED! Attempting to navigate to:', path);
    console.log('🔍 Current location:', location.pathname);
    console.log('🔍 Navigate function exists:', typeof navigate === 'function');

    try {
      navigate(path);
      console.log('✅ Navigate called successfully');
    } catch (error) {
      console.error('❌ Navigate failed:', error);
    }
  };

  // Temporalmente mostrar todos los items - DEBUG
  const allowedNavigation = navigation; // Sin filtro
  const allowedAdminNavigation = adminNavigation; // Sin filtro

  /* FILTRO ORIGINAL - Descomentar cuando funcione
  const allowedNavigation = navigation.filter(item => {
    if (item.permission) {
      return can(item.permission);
    }
    return true;
  });

  const allowedAdminNavigation = adminNavigation.filter(item => {
    if (item.permission) {
      return can(item.permission);
    }
    return true;
  });
  */

  return (
    <div className="fixed inset-y-0 z-50 flex w-72 flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 shrink-0 items-center">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="ml-3 text-xl font-bold">Axiona</span>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {allowedNavigation.map((item) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        isActive(item.href)
                          ? 'bg-gray-50 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400'
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-indigo-400 dark:hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold cursor-pointer w-full text-left'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive(item.href)
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
                          'h-6 w-6 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
            {allowedAdminNavigation.length > 0 && (
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                  Administración
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {allowedAdminNavigation.map((item) => (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          isActive(item.href)
                            ? 'bg-gray-50 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400'
                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-indigo-400 dark:hover:bg-gray-800',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold cursor-pointer w-full text-left'
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive(item.href)
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
                            'h-6 w-6 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}