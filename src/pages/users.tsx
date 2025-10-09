import React, { useState } from 'react';
import { Plus, Edit, Trash2, Shield, Settings, Users as UsersIcon, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUserPermissions, useUpdateUserPermissions, usePermissionAudit, type User, type CreateUserData, type UpdateUserData } from '@/api/users';
import { usePermissions, getRoleDisplayName, type ModuleType } from '@/hooks/use-permissions';
import { withPermission } from '@/hooks/use-permissions';

// Permission Toggle Component
interface PermissionToggleProps {
  module: ModuleType;
  permissions: Record<string, boolean>;
  onPermissionChange: (module: ModuleType, action: string, value: boolean) => void;
  disabled?: boolean;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({
  module,
  permissions,
  onPermissionChange,
  disabled = false
}) => {
  const moduleDisplayNames: Record<ModuleType, string> = {
    clientes: 'Clientes',
    items: 'Items/Productos',
    facturas: 'Facturas',
    reportes: 'Reportes',
    configuracion: 'Configuración',
    usuarios: 'Usuarios'
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-center space-x-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{moduleDisplayNames[module]}</span>
      </div>

      <div className="space-y-2 pl-6">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${module}-read`} className="text-sm">Leer</Label>
          <Switch
            id={`${module}-read`}
            checked={permissions[`${module}_read`] || false}
            onCheckedChange={(checked) => onPermissionChange(module, 'read', checked)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor={`${module}-write`} className="text-sm">Escribir</Label>
          <Switch
            id={`${module}-write`}
            checked={permissions[`${module}_write`] || false}
            onCheckedChange={(checked) => onPermissionChange(module, 'write', checked)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor={`${module}-delete`} className="text-sm">Eliminar</Label>
          <Switch
            id={`${module}-delete`}
            checked={permissions[`${module}_delete`] || false}
            onCheckedChange={(checked) => onPermissionChange(module, 'delete', checked)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

// User Form Component
interface CreateUserFormProps {
  onSubmit: (data: CreateUserData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface EditUserFormProps {
  user: User;
  onSubmit: (data: UpdateUserData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type UserFormProps = CreateUserFormProps | EditUserFormProps;

const UserForm: React.FC<UserFormProps> = (props) => {
  const { onCancel, isLoading = false } = props;
  const user = 'user' in props ? props.user : undefined;

  const [formData, setFormData] = useState({
    email: user?.email || '',
    nombre: user?.nombre || '',
    rol: user?.rol || 'vendedor' as User['rol'],
    activo: user?.activo ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (user && 'user' in props) {
      // Update - exclude email
      const { email: _, ...updateData } = formData;
      props.onSubmit(updateData);
    } else if ('onSubmit' in props) {
      // Create
      props.onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
          disabled={!!user} // Disable email editing for existing users
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol">Rol</Label>
        <Select value={formData.rol} onValueChange={(value: User['rol']) => setFormData(prev => ({ ...prev, rol: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="superadmin">Super Administrador</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="contador">Contador</SelectItem>
            <SelectItem value="vendedor">Vendedor</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
            <SelectItem value="auditor">Auditor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="activo"
          checked={formData.activo}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
        />
        <Label htmlFor="activo">Usuario activo</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};

// Permissions Dialog Component
interface PermissionsDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const PermissionsDialog: React.FC<PermissionsDialogProps> = ({ user, isOpen, onClose }) => {
  const { data: userPermissions = [] } = useUserPermissions(user.id);
  const updatePermissionsMutation = useUpdateUserPermissions();

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  // Initialize permissions when dialog opens or permissions data changes
  React.useEffect(() => {
    if (isOpen && userPermissions) {
      const permissionsMap: Record<string, boolean> = {};

      userPermissions.forEach(perm => {
        permissionsMap[`${perm.modulo}_read`] = perm.puede_leer;
        permissionsMap[`${perm.modulo}_write`] = perm.puede_escribir;
        permissionsMap[`${perm.modulo}_delete`] = perm.puede_eliminar;
      });

      setPermissions(permissionsMap);
    }
  }, [isOpen, userPermissions]);

  const handlePermissionChange = (module: ModuleType, action: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [`${module}_${action}`]: value
    }));
  };

  const handleSave = async () => {
    try {
      const modules: ModuleType[] = ['clientes', 'items', 'facturas', 'reportes', 'configuracion', 'usuarios'];

      const permissionsToSave = modules.map(module => ({
        modulo: module,
        puede_leer: permissions[`${module}_read`] || false,
        puede_escribir: permissions[`${module}_write`] || false,
        puede_eliminar: permissions[`${module}_delete`] || false
      }));

      await updatePermissionsMutation.mutateAsync({
        userId: user.id,
        permissions: permissionsToSave
      });

      toast.success('Permisos actualizados correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al actualizar permisos');
    }
  };

  const modules: ModuleType[] = ['clientes', 'items', 'facturas', 'reportes', 'configuracion', 'usuarios'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Permisos - {user.nombre}</DialogTitle>
          <DialogDescription>
            Configura los permisos de acceso por módulo para este usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Los permisos se organizan por módulo. Cada módulo tiene tres niveles: Leer, Escribir y Eliminar.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {modules.map(module => (
              <PermissionToggle
                key={module}
                module={module}
                permissions={permissions}
                onPermissionChange={handlePermissionChange}
                disabled={updatePermissionsMutation.isPending}
              />
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updatePermissionsMutation.isPending}>
              {updatePermissionsMutation.isPending ? 'Guardando...' : 'Guardar Permisos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Users Page Component
const UsersPage: React.FC = () => {
  const { data: users = [], isLoading, error } = useUsers();

  // Debug para ver qué datos llegan
  React.useEffect(() => {
    console.log('Debug UsersPage:', { users, isLoading, error });
  }, [users, isLoading, error]);
  const { data: auditLog = [] } = usePermissionAudit();
  const { canWrite, canDelete } = usePermissions();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      await createUserMutation.mutateAsync(data);
      toast.success('Usuario creado correctamente');
      setIsCreateDialogOpen(false);
    } catch {
      toast.error('Error al crear usuario');
    }
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (!editingUser) return;

    try {
      await updateUserMutation.mutateAsync({ id: editingUser.id, data });
      toast.success('Usuario actualizado correctamente');
      setEditingUser(null);
    } catch {
      toast.error('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.nombre}?`)) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);
      toast.success('Usuario eliminado correctamente');
    } catch {
      toast.error('Error al eliminar usuario');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios y sus permisos de acceso al sistema
          </p>
        </div>
        {canWrite('usuarios') && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">
            <UsersIcon className="mr-2 h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="mr-2 h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nombre}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.rol === 'superadmin' ? 'default' : 'secondary'}>
                          {getRoleDisplayName(user.rol)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.activo ? 'default' : 'destructive'}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString() : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPermissionsUser(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          {canWrite('usuarios') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete('usuarios') && user.rol !== 'superadmin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Auditoría de Permisos</CardTitle>
              <CardDescription>
                Historial de cambios en permisos de usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{entry.accion}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {entry.modulo || 'Sistema'}
                      </Badge>
                    </div>
                    {Object.keys(entry.detalles).length > 0 && (
                      <div className="mt-2 text-sm">
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(entry.detalles, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                {auditLog.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay entradas de auditoría registradas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario. Los permisos se configuran después de la creación.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            onSubmit={handleCreateUser}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createUserMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <UserForm
              user={editingUser}
              onSubmit={handleUpdateUser}
              onCancel={() => setEditingUser(null)}
              isLoading={updateUserMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      {permissionsUser && (
        <PermissionsDialog
          user={permissionsUser}
          isOpen={!!permissionsUser}
          onClose={() => setPermissionsUser(null)}
        />
      )}
    </div>
  );
};

// Export with permission protection
export default withPermission(UsersPage, 'usuarios', 'leer');