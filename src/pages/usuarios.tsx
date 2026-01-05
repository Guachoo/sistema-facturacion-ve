import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, UserData } from '@/api/users';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

const userSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
  rol: z.enum(['administrador', 'vendedor', 'promotor', 'contador'], { message: 'Rol es requerido' }),
  activo: z.boolean().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export function UsuariosPage() {
  console.log('✅ UsuariosPage component is rendering!');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data: users = [], isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      rol: 'vendedor',
      activo: true,
    },
  });

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.rol.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      // Don't send password if it's empty on edit
      const updateData = { ...data, id: editingUser.id };
      if (!data.password || data.password.trim() === '') {
        delete updateData.password;
      }

      updateMutation.mutate(updateData as UserData, {
        onSuccess: () => {
          toast.success('Usuario actualizado correctamente');
          handleCloseDialog();
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Error al actualizar el usuario');
        },
      });
    } else {
      if (!data.password || data.password.trim() === '') {
        toast.error('La contraseña es requerida al crear un usuario');
        return;
      }

      createMutation.mutate(data as UserData, {
        onSuccess: () => {
          toast.success('Usuario creado correctamente');
          handleCloseDialog();
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Error al crear el usuario');
        },
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setShowPassword(false);
    reset({
      nombre: '',
      email: '',
      password: '',
      rol: 'vendedor',
      activo: true,
    });
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setValue('nombre', user.nombre);
    setValue('email', user.email);
    setValue('rol', user.rol);
    setValue('activo', user.activo ?? true);
    setValue('password', ''); // Don't pre-fill password
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete, {
        onSuccess: () => {
          toast.success('Usuario eliminado correctamente');
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Error al eliminar el usuario');
        },
      });
    }
  };

  const getRolBadgeColor = (rol: UserRole) => {
    switch (rol) {
      case 'administrador':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'vendedor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'promotor':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'contador':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRolIcon = (rol: UserRole) => {
    switch (rol) {
      case 'administrador':
        return '👤';
      case 'vendedor':
        return '💼';
      case 'promotor':
        return '🎯';
      case 'contador':
        return '📊';
      default:
        return '👥';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios y asigna roles del sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? 'Modifica los datos del usuario. Deja la contraseña vacía si no deseas cambiarla.'
                    : 'Completa los datos del nuevo usuario del sistema.'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input
                    id="nombre"
                    {...register('nombre')}
                    placeholder="Ej: Juan Pérez"
                  />
                  {errors.nombre && (
                    <p className="text-sm text-red-500">{errors.nombre.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="usuario@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">
                    Contraseña {editingUser && <span className="text-xs text-muted-foreground">(opcional)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select
                    value={watch('rol')}
                    onValueChange={(value) => setValue('rol', value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrador">👤 Administrador</SelectItem>
                      <SelectItem value="vendedor">💼 Vendedor</SelectItem>
                      <SelectItem value="promotor">🎯 Promotor</SelectItem>
                      <SelectItem value="contador">📊 Contador</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.rol && (
                    <p className="text-sm text-red-500">{errors.rol.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="activo"
                    {...register('activo')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="activo" className="cursor-pointer">
                    Usuario activo
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Total: {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando usuarios...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nombre}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRolBadgeColor(user.rol)}>
                          {getRolIcon(user.rol)} {user.rol.charAt(0).toUpperCase() + user.rol.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.activo !== false ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <UserX className="mr-1 h-3 w-3" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        description="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
