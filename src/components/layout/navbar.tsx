import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { KeyboardShortcutsHelp } from '@/lib/keyboard-shortcuts';
import {
  Plus,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  HelpCircle,
  LayoutDashboard,
  Package,
  Users2,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const { canRead } = usePermissions();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => location.pathname === path;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null },
    { name: 'Cotizaciones', href: '/cotizaciones', icon: FileText, permission: 'cotizaciones' },
    { name: 'Facturas', href: '/facturas', icon: FileText, permission: 'facturas' },
    { name: 'Clientes', href: '/clientes', icon: Users, permission: 'clientes' },
    { name: 'Productos/Servicios', href: '/items', icon: Package, permission: 'items' },
    { name: 'Reportes', href: '/reportes', icon: BarChart3, permission: 'reportes' },
    { name: 'Configuración', href: '/configuracion', icon: Settings, permission: 'configuracion' },
  ];

  const adminNavigation = [
    { name: 'Usuarios', href: '/usuarios', icon: Users2, permission: 'usuarios' },
  ];

  const filteredNavigation = navigation.filter(item =>
    !item.permission || canRead(item.permission)
  );

  const filteredAdminNavigation = adminNavigation.filter(item =>
    !item.permission || canRead(item.permission)
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 lg:h-16 items-center justify-between px-3 lg:px-4">
        <div className="flex items-center gap-2 md:gap-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="h-7 w-7 lg:h-8 lg:w-8 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <span className="text-base lg:text-lg xl:text-xl font-bold">Axiona</span>
          </Link>

          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link
                  to="/facturas/nueva"
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Factura
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link
                  to="/clientes"
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    isActive('/clientes') && "bg-accent text-accent-foreground"
                  )}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reportes
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          to="/reportes/libro-ventas"
                        >
                          <FileText className="h-6 w-6" />
                          <div className="mb-2 mt-4 text-lg font-medium">
                            Libro de Ventas
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            Reporte fiscal mensual de ventas por canal digital y máquina fiscal.
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/reportes/igtf"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">Reporte IGTF</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Control del impuesto a las transacciones financieras.
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <Button variant="ghost" size="sm" onClick={toggleDarkMode} className="h-8 w-8 lg:h-9 lg:w-9 p-0">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="sm" className="h-8 w-8 lg:h-9 lg:w-9 p-0">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 lg:h-9 lg:w-9 p-0">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel>
                <KeyboardShortcutsHelp />
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 lg:h-9 lg:w-9 rounded-full p-0">
                <Avatar className="h-7 w-7 lg:h-8 lg:w-8">
                  <AvatarImage src="/avatars/01.png" alt={user?.nombre} />
                  <AvatarFallback className="text-xs lg:text-sm">{user?.nombre?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.nombre}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {user?.rol}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracion/empresa">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Vertical Sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/20 h-screen w-screen"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 bottom-0 left-0 z-50 w-64 h-screen max-h-screen overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 shadow-xl flex flex-col">
            {/* Header with close button */}
            <div className="flex h-14 sm:h-16 items-center justify-between px-4 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">Axiona</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSidebarOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Profile Section */}
            <div className="p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/avatars/01.png" alt={user?.nombre} />
                  <AvatarFallback className="text-lg">{user?.nombre?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{user?.nombre || 'Administrador General'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email || 'admin@sistema.com'}</p>
                  <Badge variant="default" className="text-xs mt-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    {user?.rol || 'superadmin'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 bg-white dark:bg-gray-900 min-h-0 scrollbar-thin">
              <ul className="space-y-1">
                {filteredNavigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-emerald-600 text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5",
                        isActive(item.href) ? "text-white" : "text-gray-500 dark:text-gray-400"
                      )} />
                      {item.name}
                    </Link>
                  </li>
                ))}
                {filteredAdminNavigation.length > 0 && (
                  <>
                    <li>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Administración
                      </div>
                    </li>
                    {filteredAdminNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive(item.href)
                              ? "bg-emerald-600 text-white"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5",
                            isActive(item.href) ? "text-white" : "text-gray-500 dark:text-gray-400"
                          )} />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </nav>

            {/* Settings and Logout Section */}
            <div className="p-3 sm:p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between py-2 px-3 mb-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3">
                  {darkMode ? <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" /> : <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo {darkMode ? 'Claro' : 'Oscuro'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="h-6 w-10 p-0"
                >
                  <div className={cn(
                    "w-8 h-4 bg-gray-200 rounded-full relative transition-colors",
                    darkMode && "bg-primary"
                  )}>
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform",
                      darkMode ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                </Button>
              </div>

              {/* Settings */}
              <Link
                to="/configuracion"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
              >
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                Configuración
              </Link>

              {/* Logout */}
              <button
                onClick={() => {
                  logout();
                  setMobileSidebarOpen(false);
                }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 w-full"
              >
                <LogOut className="h-5 w-5 text-red-500" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}