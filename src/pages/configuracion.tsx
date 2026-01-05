import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users2, Settings, FileText, Shield } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { Protected } from '@/components/auth/protected';

export function ConfiguracionPage() {
  console.log('✅ ConfiguracionPage component is rendering!');
  const { can } = usePermissions();

  const configSections = [
    {
      icon: Building,
      title: 'Datos de la Empresa',
      description: 'Configurar razón social, RIF, domicilio fiscal y datos de contacto',
      href: '/configuracion/empresa',
      permission: 'view_settings' as const,
      color: 'bg-blue-500',
    },
    {
      icon: FileText,
      title: 'Números de Control',
      description: 'Gestionar rangos de números de control para facturación',
      href: '/configuracion/empresa#numeros-control',
      permission: 'manage_control_numbers' as const,
      color: 'bg-green-500',
    },
    {
      icon: Users2,
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios del sistema y asignar roles',
      href: '/usuarios',
      permission: 'manage_users' as const,
      color: 'bg-purple-500',
    },
    {
      icon: Shield,
      title: 'Roles y Permisos',
      description: 'Ver la matriz de permisos por rol del sistema',
      href: '#',
      permission: 'manage_users' as const,
      color: 'bg-orange-500',
      comingSoon: true,
    },
  ];

  // Temporalmente mostrar todas las secciones para debug
  const availableSections = configSections; // Comentar el filtro por ahora

  /* FILTRO ORIGINAL - Descomentar cuando funcione
  const availableSections = configSections.filter(section => {
    try {
      const hasPermission = can(section.permission);
      console.log(`Permission ${section.permission}:`, hasPermission);
      return hasPermission;
    } catch (error) {
      console.error('Error checking permission:', section.permission, error);
      return false;
    }
  });
  */

  console.log('Total sections:', configSections.length);
  console.log('Available sections:', availableSections.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Administra la configuración del sistema de facturación
          </p>
        </div>
      </div>

      {/* Debug info - temporal */}
      <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Debug:</strong> Secciones disponibles: {availableSections.length} de {configSections.length}
          </p>
        </CardContent>
      </Card>

      {/* Configuration Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableSections.map((section) => (
          <Card key={section.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`${section.color} p-3 rounded-lg text-white`}>
                  <section.icon className="h-6 w-6" />
                </div>
                {section.comingSoon && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded">
                    Próximamente
                  </span>
                )}
              </div>
              <CardTitle className="mt-4">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {section.comingSoon ? (
                <Button disabled className="w-full" variant="outline">
                  No disponible
                </Button>
              ) : (
                <Link to={section.href} className="block">
                  <Button className="w-full">
                    Acceder
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {availableSections.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes permisos para acceder a ninguna sección de configuración.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Shield className="h-5 w-5" />
            Permisos de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-2">Acceso según tu rol:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Administrador:</strong> Acceso completo a todas las configuraciones</li>
            <li><strong>Contador:</strong> Solo visualización de configuración de empresa</li>
            <li><strong>Vendedor/Promotor:</strong> Sin acceso a configuración</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
