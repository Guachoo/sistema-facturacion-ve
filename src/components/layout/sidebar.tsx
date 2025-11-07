import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  Users2,
  FileTextIcon,
  DollarSign,
  Shield,
  Activity,
  Webhook,
  Code,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null },
  { name: 'Cotizaciones', href: '/cotizaciones', icon: FileTextIcon, permission: 'cotizaciones' },
  { name: 'Facturas', href: '/facturas', icon: FileText, permission: 'facturas' },
  { name: 'Clientes & CRM', href: '/clientes', icon: Users, permission: 'clientes' },
  { name: 'Productos/Servicios', href: '/items', icon: Package, permission: 'items' },
  { name: 'Reportes', href: '/reportes', icon: BarChart3, permission: 'reportes' },
  { name: 'Configuración', href: '/configuracion', icon: Settings, permission: 'configuracion' },
];

const adminNavigation = [
  { name: 'Usuarios', href: '/usuarios', icon: Users2, permission: 'usuarios' },
];

const fiscalNavigation = [
  { name: 'Tasas BCV', href: '/configuracion/tasas-bcv', icon: DollarSign },
  { name: 'Auditoría TFHKA', href: '/auditoria/tfhka', icon: Shield },
  { name: 'Dashboard Auditoría', href: '/auditoria/dashboard', icon: Activity },
];


const integrationNavigation = [
  { name: 'Gestión Webhooks', href: '/integraciones/webhooks', icon: Webhook },
  { name: 'API Docs', href: '/integraciones/api-docs', icon: Code },
];

const helpNavigation = [
  { name: 'Guías de Usuario', href: '/ayuda/guias', icon: HelpCircle },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { canRead } = usePermissions();

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Filtrar navegación principal basada en permisos
  const filteredNavigation = navigation.filter(item =>
    !item.permission || canRead(item.permission as any)
  );

  // Filtrar navegación de admin basada en permisos
  const filteredAdminNavigation = adminNavigation.filter(item =>
    !item.permission || canRead(item.permission as any)
  );

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
                {filteredNavigation.map((item) => (
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
            {filteredAdminNavigation.length > 0 && (
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                  Administración
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {filteredAdminNavigation.map((item) => (
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

            {/* Fiscal Navigation - Available to all users */}
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                Herramientas Fiscales
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {fiscalNavigation.map((item) => (
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

            {/* Integration Navigation - Available to admin users */}
            {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                  Integraciones
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {integrationNavigation.map((item) => (
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

            {/* Help Navigation - Available to all users */}
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500">
                Ayuda
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {helpNavigation.map((item) => (
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

          </ul>
        </nav>
      </div>
    </div>
  );
}