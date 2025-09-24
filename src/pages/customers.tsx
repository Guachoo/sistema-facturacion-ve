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
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/api/customers';
import { RifInput } from '@/components/ui/rif-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Customer } from '@/types';

const customerSchema = z.object({
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  nombre: z.string().optional(),
  domicilio: z.string().min(1, 'Domicilio es requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipoContribuyente: z.enum(['especial', 'ordinario', 'formal'], { message: 'Tipo de contribuyente es requerido' }),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useCustomers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      tipoContribuyente: 'ordinario',
    },
  });

  const filteredCustomers = customers.filter(customer =>
    customer.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    customer.rif.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: CustomerForm) => {
    if (editingCustomer) {
      updateMutation.mutate(
        { ...data, id: editingCustomer.id },
        {
          onSuccess: () => {
            toast.success('Cliente actualizado correctamente');
            handleCloseDialog();
          },
          onError: () => {
            toast.error('Error al actualizar el cliente');
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Cliente creado correctamente');
          handleCloseDialog();
        },
        onError: (error: any) => {
          console.error('Error creating customer:', error);
          const errorMessage = error?.message || 'Error desconocido al crear el cliente';
          toast.error(errorMessage, {
            description: 'Revisa los datos e inténtalo de nuevo',
            duration: 5000,
          });
        },
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    reset();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    Object.entries(customer).forEach(([key, value]) => {
      setValue(key as keyof CustomerForm, value);
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCustomerToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete, {
        onSuccess: () => {
          toast.success('Cliente eliminado correctamente');
          setDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        },
        onError: () => {
          toast.error('Error al eliminar el cliente');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tu base de datos de clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Modifica' : 'Completa'} la información del cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rif">RIF *</Label>
                  <RifInput
                    id="rif"
                    value={watch('rif') || ''}
                    onChange={(value) => setValue('rif', value)}
                  />
                  {errors.rif && (
                    <p className="text-sm text-destructive">{errors.rif.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razón Social *</Label>
                  <Input
                    id="razonSocial"
                    {...register('razonSocial')}
                  />
                  {errors.razonSocial && (
                    <p className="text-sm text-destructive">{errors.razonSocial.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Comercial</Label>
                <Input
                  id="nombre"
                  {...register('nombre')}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilio">Domicilio *</Label>
                <Input
                  id="domicilio"
                  {...register('domicilio')}
                  placeholder="Dirección completa"
                />
                {errors.domicilio && (
                  <p className="text-sm text-destructive">{errors.domicilio.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    {...register('telefono')}
                    placeholder="+58-212-1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="cliente@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoContribuyente">Tipo de Contribuyente *</Label>
                <Select
                  value={watch('tipoContribuyente')}
                  onValueChange={(value) => setValue('tipoContribuyente', value as 'especial' | 'ordinario' | 'formal')}
                >
                  <SelectTrigger id="tipoContribuyente">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especial">Contribuyente Especial</SelectItem>
                    <SelectItem value="ordinario">Contribuyente Ordinario</SelectItem>
                    <SelectItem value="formal">Contribuyente Formal</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipoContribuyente && (
                  <p className="text-sm text-destructive">{errors.tipoContribuyente.message}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCustomer ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o RIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RIF</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>Domicilio</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Características</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono">{customer.rif}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.razonSocial}</div>
                        {customer.nombre && (
                          <div className="text-sm text-muted-foreground">
                            {customer.nombre}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {customer.domicilio}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.telefono && (
                          <div>{customer.telefono}</div>
                        )}
                        {customer.email && (
                          <div className="text-muted-foreground">{customer.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {customer.esContribuyenteEspecial && (
                          <Badge variant="secondary" className="text-xs">
                            C.E.
                          </Badge>
                        )}
                        {customer.esAgenteRetencion && (
                          <Badge variant="secondary" className="text-xs">
                            A.R.
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar Cliente"
        description="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
}