import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserPermissions } from '@/api/users';
import { tokenManager, userManager } from '@/lib/api-client';
import { fixUserPermissions, ensureSuperAdminPermissions, createTestUser } from '@/lib/fix-permissions';
import { AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Wrench, Shield, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function DebugAuth() {
  const { user, isAuthenticated } = useAuth();
  const {
    canRead,
    canWrite,
    canDelete,
    isLoading: permissionsLoading,
    isSuperAdmin
  } = usePermissions();

  const { data: userPermissions = [], isLoading: userPermLoading } = useUserPermissions(user?.id || '');
  const [showTokens, setShowTokens] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFixing, setIsFixing] = useState(false);

  const modules = [
    'clientes',
    'items',
    'cotizaciones',
    'facturas',
    'reportes',
    'configuracion',
    'usuarios'
  ] as const;

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
    window.location.reload();
  };

  const clearStorage = () => {
    tokenManager.remove();
    userManager.remove();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleFixPermissions = async () => {
    setIsFixing(true);
    try {
      const result = await fixUserPermissions(user?.id);
      if (result.success) {
        toast.success(result.message);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al corregir permisos');
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixSuperAdmin = async () => {
    setIsFixing(true);
    try {
      const result = await ensureSuperAdminPermissions();
      if (result.success) {
        toast.success(result.message);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al corregir permisos de superadmin');
    } finally {
      setIsFixing(false);
    }
  };

  const handleCreateTestUser = async () => {
    setIsFixing(true);
    try {
      const result = await createTestUser();
      if (result.success) {
        toast.success(`${result.message}. Email: ${result.credentials?.email}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al crear usuario de prueba');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-6 space-y-6" key={refreshKey}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Diagnóstico de Autenticación</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={forceRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={clearStorage} variant="destructive" size="sm">
            Limpiar Storage
          </Button>
        </div>
      </div>

      {/* Herramientas de Corrección */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">🔧 Herramientas de Corrección</CardTitle>
          <CardDescription>
            Usa estas herramientas para solucionar problemas comunes de permisos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleFixPermissions}
              disabled={isFixing || !user?.id}
              variant="default"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Wrench className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Corregir Permisos</div>
                <div className="text-xs opacity-75">Usuario actual</div>
              </div>
            </Button>

            <Button
              onClick={handleFixSuperAdmin}
              disabled={isFixing}
              variant="secondary"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Shield className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Arreglar SuperAdmin</div>
                <div className="text-xs opacity-75">Todos los superadmins</div>
              </div>
            </Button>

            <Button
              onClick={handleCreateTestUser}
              disabled={isFixing}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <UserPlus className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Crear Usuario Test</div>
                <div className="text-xs opacity-75">admin@axiona.test</div>
              </div>
            </Button>
          </div>

          {isFixing && (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Procesando correcciones...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estado de Autenticación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAuthenticated ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            Estado de Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Autenticado:</Label>
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? 'SÍ' : 'NO'}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Usuario:</Label>
              <span className="ml-2">{user?.nombre || 'N/A'}</span>
            </div>
            <div>
              <Label className="text-sm font-medium">Email:</Label>
              <span className="ml-2">{user?.email || 'N/A'}</span>
            </div>
            <div>
              <Label className="text-sm font-medium">Rol:</Label>
              <Badge variant="outline">{user?.rol || 'N/A'}</Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">ID Usuario:</Label>
              <span className="ml-2 font-mono text-xs">{user?.id || 'N/A'}</span>
            </div>
            <div>
              <Label className="text-sm font-medium">Super Admin:</Label>
              <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                {isSuperAdmin ? 'SÍ' : 'NO'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokens de Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTokens(!showTokens)}
            >
              {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            Tokens de Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Auth Token:</Label>
            <div className="bg-muted p-2 rounded text-xs font-mono break-all">
              {showTokens ? (tokenManager.get() || 'NO EXISTE') : '***'}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">User Data:</Label>
            <div className="bg-muted p-2 rounded text-xs font-mono">
              {showTokens ? (
                <pre>{JSON.stringify(userManager.get(), null, 2) || 'NO EXISTE'}</pre>
              ) : '***'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado de Permisos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {permissionsLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            ) : userPermissions.length > 0 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            Estado de Permisos
          </CardTitle>
          <CardDescription>
            Cargando permisos: {permissionsLoading ? 'SÍ' : 'NO'} |
            Permisos encontrados: {userPermissions.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissionsLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando permisos...
            </div>
          ) : userPermissions.length === 0 ? (
            <div className="text-center py-4 text-yellow-600">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              No se encontraron permisos para este usuario
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium">Permisos por Módulo:</h4>
              <div className="grid gap-2">
                {modules.map(module => (
                  <div key={module} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-medium capitalize">{module}</span>
                    <div className="space-x-2">
                      <Badge variant={canRead(module) ? "default" : "secondary"} className="text-xs">
                        Leer: {canRead(module) ? 'SÍ' : 'NO'}
                      </Badge>
                      <Badge variant={canWrite(module) ? "default" : "secondary"} className="text-xs">
                        Escribir: {canWrite(module) ? 'SÍ' : 'NO'}
                      </Badge>
                      <Badge variant={canDelete(module) ? "default" : "secondary"} className="text-xs">
                        Eliminar: {canDelete(module) ? 'SÍ' : 'NO'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permisos Raw de la Base de Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Permisos Raw (Base de Datos)</CardTitle>
          <CardDescription>
            Datos directos de la API de permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userPermLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando datos de permisos...
            </div>
          ) : (
            <div className="bg-muted p-4 rounded">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(userPermissions, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Posibles Problemas y Soluciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isAuthenticated && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No autenticado</AlertTitle>
              <AlertDescription>
                El usuario no está autenticado. Verifica que el login funcione correctamente.
              </AlertDescription>
            </Alert>
          )}

          {isAuthenticated && !user && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Usuario nulo</AlertTitle>
              <AlertDescription>
                Autenticado pero sin datos de usuario. Problema en el AuthProvider.
              </AlertDescription>
            </Alert>
          )}

          {isAuthenticated && user && userPermissions.length === 0 && !isSuperAdmin && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sin permisos</AlertTitle>
              <AlertDescription>
                Usuario autenticado pero sin permisos en la base de datos. Verifica la tabla user_permissions.
              </AlertDescription>
            </Alert>
          )}

          {isAuthenticated && user && permissionsLoading && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Permisos cargando</AlertTitle>
              <AlertDescription>
                Los permisos están tardando mucho en cargar. Verifica la conexión a Supabase.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DebugAuth;