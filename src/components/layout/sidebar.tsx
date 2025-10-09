import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  Users2
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Facturas', href: '/facturas', icon: FileText },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Productos/Servicios', href: '/items', icon: Package },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

const adminNavigation = [
  { name: 'Usuarios', href: '/usuarios', icon: Users2 },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
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
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        isActive(item.href)
                          ? 'bg-gray-50 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400'
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-indigo-400 dark:hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
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
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            {user?.rol === 'admin' && (
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                  Administración
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {adminNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          isActive(item.href)
                            ? 'bg-gray-50 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400'
                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-indigo-400 dark:hover:bg-gray-800',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
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
                      </Link>
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