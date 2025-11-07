import React, { useState } from 'react';
import { Plus, Edit, Trash2, Shield, Settings, Users as UsersIcon, History, Building, Globe } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// FASE 8: Tipos extendidos para multi-empresa
interface MultiCompany {
  id: string;
  razonSocial: string;
  rif: string;
  activa: boolean;
  tipo: 'principal' | 'sucursal';
}

interface UserCompanyPermission {
  empresaId: string;
  empresaRif: string;
  empresaNombre: string;
  permisos: Record<string, boolean>;
  activo: boolean;
  fechaAsignacion: string;
  asignadoPor: string;
}

interface MultiCompanyUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  empresas: UserCompanyPermission[];
  fechaCreacion: string;
  ultimoAcceso: string;
  createdBy: string;
}

type ModuleType = 'clientes' | 'items' | 'cotizaciones' | 'facturas' | 'reportes' | 'configuracion' | 'usuarios';

// Mock data para empresas
const mockCompanies: MultiCompany[] = [
  {
    id: '1',
    razonSocial: 'Corporación Principal C.A.',
    rif: 'J-12345678-9',
    activa: true,
    tipo: 'principal',
  },
  {
    id: '2',
    razonSocial: 'Sucursal Valencia C.A.',
    rif: 'J-87654321-0',
    activa: true,
    tipo: 'sucursal',
  },
  {
    id: '3',
    razonSocial: 'Filial Maracaibo S.A.',
    rif: 'J-11223344-5',
    activa: false,
    tipo: 'sucursal',
  },
];

// Mock data para usuarios multi-empresa
const mockMultiUsers: MultiCompanyUser[] = [
  {
    id: '1',
    nombre: 'Carlos Admin',
    email: 'carlos@principal.com',
    rol: 'Super Admin',
    activo: true,
    fechaCreacion: '2024-01-15',
    ultimoAcceso: '2025-01-06',
    createdBy: 'system',
    empresas: [
      {
        empresaId: '1',
        empresaRif: 'J-12345678-9',
        empresaNombre: 'Corporación Principal C.A.',
        activo: true,
        fechaAsignacion: '2024-01-15',
        asignadoPor: 'system',
        permisos: {
          clientes_read: true,
          clientes_write: true,
          clientes_delete: true,
          facturas_read: true,
          facturas_write: true,
          facturas_delete: true,
          reportes_read: true,
          configuracion_read: true,
          configuracion_write: true,
          usuarios_read: true,
          usuarios_write: true,
          usuarios_delete: true,
        },
      },
      {
        empresaId: '2',
        empresaRif: 'J-87654321-0',
        empresaNombre: 'Sucursal Valencia C.A.',
        activo: true,
        fechaAsignacion: '2024-01-15',
        asignadoPor: 'system',
        permisos: {
          clientes_read: true,
          clientes_write: true,
          facturas_read: true,
          facturas_write: true,
          reportes_read: true,
          configuracion_read: true,
        },
      },
    ],
  },
  {
    id: '2',
    nombre: 'María Contadora',
    email: 'maria@principal.com',
    rol: 'Contador',
    activo: true,
    fechaCreacion: '2024-02-20',
    ultimoAcceso: '2025-01-05',
    createdBy: 'carlos@principal.com',
    empresas: [
      {
        empresaId: '1',
        empresaRif: 'J-12345678-9',
        empresaNombre: 'Corporación Principal C.A.',
        activo: true,
        fechaAsignacion: '2024-02-20',
        asignadoPor: 'carlos@principal.com',
        permisos: {
          clientes_read: true,
          facturas_read: true,
          facturas_write: true,
          reportes_read: true,
          reportes_write: true,
        },
      },
    ],
  },
  {
    id: '3',
    nombre: 'José Vendedor',
    email: 'jose.valencia@principal.com',
    rol: 'Vendedor',
    activo: true,
    fechaCreacion: '2024-03-10',
    ultimoAcceso: '2025-01-06',
    createdBy: 'carlos@principal.com',
    empresas: [
      {
        empresaId: '2',
        empresaRif: 'J-87654321-0',
        empresaNombre: 'Sucursal Valencia C.A.',
        activo: true,
        fechaAsignacion: '2024-03-10',
        asignadoPor: 'carlos@principal.com',
        permisos: {
          clientes_read: true,
          clientes_write: true,
          facturas_read: true,
          facturas_write: true,
          cotizaciones_read: true,
          cotizaciones_write: true,
        },
      },
    ],
  },
];

// Componente para gestión de permisos por empresa
interface CompanyPermissionsPanelProps {
  user: MultiCompanyUser;
  companies: MultiCompany[];
  onSave: (userId: string, companyPermissions: UserCompanyPermission[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CompanyPermissionsPanel: React.FC<CompanyPermissionsPanelProps> = ({
  user,
  companies,
  onSave,
  isOpen,
  onClose
}) => {
  const [userPermissions, setUserPermissions] = useState<UserCompanyPermission[]>(user.empresas);

  const modules: ModuleType[] = ['clientes', 'items', 'cotizaciones', 'facturas', 'reportes', 'configuracion', 'usuarios'];

  const handlePermissionChange = (companyId: string, module: ModuleType, action: string, value: boolean) => {
    setUserPermissions(prev =>
      prev.map(perm =>
        perm.empresaId === companyId
          ? {
              ...perm,
              permisos: {
                ...perm.permisos,
                [`${module}_${action}`]: value
              }
            }
          : perm
      )
    );
  };

  const handleAddCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const newPermission: UserCompanyPermission = {
      empresaId: companyId,
      empresaRif: company.rif,
      empresaNombre: company.razonSocial,
      activo: true,
      fechaAsignacion: new Date().toISOString().split('T')[0],
      asignadoPor: 'current_user@system.com',
      permisos: {},
    };

    setUserPermissions(prev => [...prev, newPermission]);
  };

  const handleRemoveCompany = (companyId: string) => {
    setUserPermissions(prev => prev.filter(perm => perm.empresaId !== companyId));
  };

  const handleToggleCompanyActive = (companyId: string) => {
    setUserPermissions(prev =>
      prev.map(perm =>
        perm.empresaId === companyId
          ? { ...perm, activo: !perm.activo }
          : perm
      )
    );
  };

  const handleSave = () => {
    onSave(user.id, userPermissions);
    onClose();
  };

  const availableCompanies = companies.filter(company =>
    !userPermissions.some(perm => perm.empresaId === company.id) && company.activa
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Permisos Multi-empresa - {user.nombre}
          </DialogTitle>
          <DialogDescription>
            Gestiona los permisos del usuario en cada empresa del grupo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agregar nueva empresa */}
          {availableCompanies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Asignar Nueva Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Select onValueChange={handleAddCompany}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.razonSocial} ({company.rif})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permisos por empresa */}
          <div className="space-y-4">
            {userPermissions.map((companyPerm) => {
              const company = companies.find(c => c.id === companyPerm.empresaId);
              if (!company) return null;

              return (
                <Card key={companyPerm.empresaId} className={!companyPerm.activo ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{companyPerm.empresaNombre}</CardTitle>
                          <CardDescription className="text-sm">
                            {companyPerm.empresaRif} • Asignado: {companyPerm.fechaAsignacion}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={companyPerm.activo}
                          onCheckedChange={() => handleToggleCompanyActive(companyPerm.empresaId)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveCompany(companyPerm.empresaId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
                      {modules.map(module => (
                        <div key={module} className="border rounded p-2">
                          <div className="font-medium text-xs mb-2 capitalize">{module}</div>
                          <div className="space-y-1">
                            {['read', 'write', 'delete'].map(action => (
                              <div key={action} className="flex items-center justify-between">
                                <Label className="text-xs" htmlFor={`${companyPerm.empresaId}-${module}-${action}`}>
                                  {action === 'read' ? 'Leer' : action === 'write' ? 'Escribir' : 'Eliminar'}
                                </Label>
                                <Switch
                                  id={`${companyPerm.empresaId}-${module}-${action}`}
                                  checked={companyPerm.permisos[`${module}_${action}`] || false}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(companyPerm.empresaId, module, action, checked)
                                  }
                                  disabled={!companyPerm.activo}
                                  className="scale-75"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {userPermissions.length === 0 && (
            <Alert>
              <AlertDescription>
                Este usuario no tiene empresas asignadas. Use el selector superior para asignar una empresa.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar Permisos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente principal
export function MultiCompanyUsersPage() {
  const [users, setUsers] = useState<MultiCompanyUser[]>(mockMultiUsers);
  const [companies] = useState<MultiCompany[]>(mockCompanies);
  const [selectedUser, setSelectedUser] = useState<MultiCompanyUser | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<MultiCompanyUser | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  const [newUserForm, setNewUserForm] = useState({
    nombre: '',
    email: '',
    rol: '',
    empresas: [] as string[],
  });

  const handleSavePermissions = (userId: string, companyPermissions: UserCompanyPermission[]) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, empresas: companyPermissions }
          : user
      )
    );
    toast.success('Permisos actualizados correctamente');
  };

  const handleCreateUser = () => {
    if (!newUserForm.nombre || !newUserForm.email || !newUserForm.rol) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    const newUser: MultiCompanyUser = {
      id: Date.now().toString(),
      nombre: newUserForm.nombre,
      email: newUserForm.email,
      rol: newUserForm.rol,
      activo: true,
      fechaCreacion: new Date().toISOString().split('T')[0],
      ultimoAcceso: 'Nunca',
      createdBy: 'current_user@system.com',
      empresas: newUserForm.empresas.map(empresaId => {
        const company = companies.find(c => c.id === empresaId);
        return {
          empresaId,
          empresaRif: company?.rif || '',
          empresaNombre: company?.razonSocial || '',
          activo: true,
          fechaAsignacion: new Date().toISOString().split('T')[0],
          asignadoPor: 'current_user@system.com',
          permisos: {},
        };
      }),
    };

    setUsers(prev => [...prev, newUser]);
    setNewUserForm({ nombre: '', email: '', rol: '', empresas: [] });
    setIsCreateDialogOpen(false);
    toast.success('Usuario creado correctamente');
  };

  const handleToggleUserActive = (userId: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, activo: !user.activo }
          : user
      )
    );
    const user = users.find(u => u.id === userId);
    toast.success(`Usuario ${user?.nombre} ${user?.activo ? 'desactivado' : 'activado'}`);
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.nombre}?`)) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(`Usuario ${user.nombre} eliminado correctamente`);
    }
  };

  const activeCompanies = companies.filter(c => c.activa);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Usuarios Multi-empresa</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona usuarios y permisos por empresa del grupo corporativo
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <UsersIcon className="mr-2 h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building className="mr-2 h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Globe className="mr-2 h-4 w-4" />
            Resumen
          </TabsTrigger>
        </TabsList>

        {/* Tab de Usuarios */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuarios Multi-empresa</CardTitle>
              <CardDescription>
                {users.length} usuario{users.length !== 1 ? 's' : ''} con acceso a empresas del grupo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Empresas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.nombre}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.rol}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.empresas.filter(e => e.activo).map((empresa) => (
                            <div key={empresa.empresaId} className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {empresa.empresaNombre}
                              </Badge>
                            </div>
                          ))}
                          {user.empresas.filter(e => e.activo).length === 0 && (
                            <span className="text-xs text-muted-foreground">Sin empresas asignadas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.activo}
                            onCheckedChange={() => handleToggleUserActive(user.id)}
                          />
                          <span className="text-xs">
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.ultimoAcceso}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsPermissionsDialogOpen(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Empresas */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>Empresas del Grupo</CardTitle>
              <CardDescription>
                Estado de las empresas y usuarios asignados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => {
                  const usersInCompany = users.filter(user =>
                    user.empresas.some(e => e.empresaId === company.id && e.activo)
                  );

                  return (
                    <Card key={company.id} className={!company.activa ? 'opacity-60' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg">{company.razonSocial}</CardTitle>
                            <CardDescription className="text-sm">{company.rif}</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={company.tipo === 'principal' ? 'default' : 'secondary'}>
                            {company.tipo === 'principal' ? 'Principal' : 'Sucursal'}
                          </Badge>
                          <Badge variant={company.activa ? 'default' : 'destructive'}>
                            {company.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Usuarios asignados:</span>
                            <Badge variant="outline">{usersInCompany.length}</Badge>
                          </div>
                          {usersInCompany.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {usersInCompany.slice(0, 3).map(user => (
                                <div key={user.id}>• {user.nombre}</div>
                              ))}
                              {usersInCompany.length > 3 && (
                                <div>• +{usersInCompany.length - 3} más...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Resumen */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.filter(u => u.activo).length} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empresas</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companies.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCompanies.length} activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asignaciones</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.reduce((acc, user) => acc + user.empresas.filter(e => e.activo).length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  usuario-empresa activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.rol === 'Super Admin').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  con acceso total
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para crear usuario */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crear un usuario con acceso a empresas específicas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  value={newUserForm.nombre}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="juan@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select value={newUserForm.rol} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, rol: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Contador">Contador</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                  <SelectItem value="Cajero">Cajero</SelectItem>
                  <SelectItem value="Consulta">Solo Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empresas Iniciales (opcional)</Label>
              <div className="grid grid-cols-1 gap-2">
                {activeCompanies.map(company => (
                  <div key={company.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`company-${company.id}`}
                      checked={newUserForm.empresas.includes(company.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewUserForm(prev => ({
                            ...prev,
                            empresas: [...prev.empresas, company.id]
                          }));
                        } else {
                          setNewUserForm(prev => ({
                            ...prev,
                            empresas: prev.empresas.filter(id => id !== company.id)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`company-${company.id}`} className="text-sm">
                      {company.razonSocial} ({company.rif})
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes asignar permisos específicos después de crear el usuario
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>
                Crear Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para gestión de permisos */}
      {selectedUser && (
        <CompanyPermissionsPanel
          user={selectedUser}
          companies={companies}
          onSave={handleSavePermissions}
          isOpen={isPermissionsDialogOpen}
          onClose={() => {
            setIsPermissionsDialogOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}