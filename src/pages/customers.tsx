import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, Eye, Phone, Mail, User, DollarSign, Clock, CheckCircle, UserCheck } from 'lucide-react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/api/customers';
import { RifInput } from '@/components/ui/rif-input';
import { usePermissions } from '@/hooks/use-permissions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { validateRIF, formatVES } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Customer } from '@/types';

// Lead interface for CRM functionality
interface Lead {
  id: string;
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  estado: 'prospecto' | 'contactado' | 'interesado' | 'negociacion' | 'cerrado' | 'perdido';
  valorEstimado: number;
  fechaCreacion: string;
  proximoSeguimiento: string;
  vendedorId: string;
  notas: string;
}

const mockLeads: Lead[] = [
  {
    id: '1',
    nombre: 'Carlos Rodríguez',
    empresa: 'TechCorp',
    telefono: '+58 412-555-0123',
    email: 'carlos@techcorp.com',
    estado: 'negociacion',
    valorEstimado: 500000,
    fechaCreacion: '2024-01-15',
    proximoSeguimiento: '2024-01-20',
    vendedorId: '1',
    notas: 'Interesado en software de gestión'
  },
  {
    id: '2',
    nombre: 'María González',
    empresa: 'ServicePlus',
    telefono: '+58 414-555-0456',
    email: 'maria@serviceplus.com',
    estado: 'interesado',
    valorEstimado: 150000,
    fechaCreacion: '2024-01-18',
    proximoSeguimiento: '2024-01-22',
    vendedorId: '1',
    notas: 'Necesita cotización'
  }
];

const estadoConfig = {
  prospecto: { label: 'Prospecto', color: 'bg-gray-100 text-gray-800' },
  contactado: { label: 'Contactado', color: 'bg-blue-100 text-blue-800' },
  interesado: { label: 'Interesado', color: 'bg-yellow-100 text-yellow-800' },
  negociacion: { label: 'Negociación', color: 'bg-orange-100 text-orange-800' },
  cerrado: { label: 'Cerrado', color: 'bg-green-100 text-green-800' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800' }
};

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
  const [activeTab, setActiveTab] = useState('customers');

  // CRM States
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [nuevoLead, setNuevoLead] = useState<Partial<Lead>>({
    estado: 'prospecto',
    valorEstimado: 0,
    vendedorId: '1'
  });

  const { data: customers = [], isLoading } = useCustomers();
  const { canWrite, canDelete } = usePermissions();
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

  const handleCreateLead = () => {
    if (!nuevoLead.nombre || !nuevoLead.empresa) {
      toast.error('Nombre y empresa son requeridos');
      return;
    }

    const newLead: Lead = {
      id: Date.now().toString(),
      nombre: nuevoLead.nombre!,
      empresa: nuevoLead.empresa!,
      telefono: nuevoLead.telefono || '',
      email: nuevoLead.email || '',
      estado: nuevoLead.estado || 'prospecto',
      valorEstimado: nuevoLead.valorEstimado || 0,
      fechaCreacion: new Date().toISOString().split('T')[0],
      proximoSeguimiento: nuevoLead.proximoSeguimiento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendedorId: nuevoLead.vendedorId || '1',
      notas: nuevoLead.notas || ''
    };

    setLeads([...leads, newLead]);
    setNuevoLead({ estado: 'prospecto', valorEstimado: 0, vendedorId: '1' });
    setIsLeadDialogOpen(false);
    toast.success('Lead creado correctamente');
  };

  const updateLeadStatus = (leadId: string, newStatus: string) => {
    setLeads(leads.map(lead =>
      lead.id === leadId ? { ...lead, estado: newStatus as Lead['estado'] } : lead
    ));
    toast.success('Estado actualizado');
  };

  const convertLeadToCustomer = (lead: Lead) => {
    // Logic to convert lead to customer would go here
    toast.success(`Lead ${lead.nombre} convertido a cliente`);
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes & CRM</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona tu base de datos de clientes y seguimiento de leads
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {canWrite('clientes') && activeTab === 'customers' && (
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer ? 'Modifica' : 'Completa'} la información del cliente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1 sm:px-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
            {canWrite('clientes') && activeTab === 'leads' && (
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Lead
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Lead</DialogTitle>
                <DialogDescription>
                  Registra un nuevo prospecto para seguimiento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 px-1 sm:px-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={nuevoLead.nombre || ''}
                      onChange={(e) => setNuevoLead({...nuevoLead, nombre: e.target.value})}
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Input
                      value={nuevoLead.empresa || ''}
                      onChange={(e) => setNuevoLead({...nuevoLead, empresa: e.target.value})}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={nuevoLead.telefono || ''}
                      onChange={(e) => setNuevoLead({...nuevoLead, telefono: e.target.value})}
                      placeholder="+58 412-555-0123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={nuevoLead.email || ''}
                      onChange={(e) => setNuevoLead({...nuevoLead, email: e.target.value})}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={nuevoLead.estado}
                      onValueChange={(value) => setNuevoLead({...nuevoLead, estado: value as Lead['estado']})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospecto">Prospecto</SelectItem>
                        <SelectItem value="contactado">Contactado</SelectItem>
                        <SelectItem value="interesado">Interesado</SelectItem>
                        <SelectItem value="negociacion">Negociación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Estimado (VES)</Label>
                    <Input
                      type="number"
                      value={nuevoLead.valorEstimado || ''}
                      onChange={(e) => setNuevoLead({...nuevoLead, valorEstimado: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Próximo Seguimiento</Label>
                  <Input
                    type="date"
                    value={nuevoLead.proximoSeguimiento || ''}
                    onChange={(e) => setNuevoLead({...nuevoLead, proximoSeguimiento: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={nuevoLead.notas || ''}
                    onChange={(e) => setNuevoLead({...nuevoLead, notas: e.target.value})}
                    placeholder="Notas adicionales sobre el prospecto..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLeadDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLead}>
                  Crear Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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

          {/* Table - Desktop */}
          <Card className="hidden md:block">
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
                            {canWrite('clientes') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(customer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete('clientes') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(customer.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cards - Mobile */}
          <div className="md:hidden grid grid-cols-2 gap-2 sm:gap-3">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    Cargando clientes...
                  </div>
                </CardContent>
              </Card>
            ) : filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    No se encontraron clientes
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-2 sm:p-3">
                    <div className="space-y-1 sm:space-y-2">
                      {/* Header compact */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-medium truncate">{customer.rif}</div>
                          <div className="font-semibold text-xs sm:text-sm truncate" title={customer.razonSocial}>
                            {customer.razonSocial}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-1">
                          {canWrite('clientes') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit(customer)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {canDelete('clientes') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDelete(customer.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Contact info compact */}
                      <div className="text-xs text-muted-foreground">
                        {customer.telefono && (
                          <div className="truncate">{customer.telefono}</div>
                        )}
                        {customer.email && (
                          <div className="truncate">{customer.email}</div>
                        )}
                      </div>

                      {/* Badges compact */}
                      {(customer.esContribuyenteEspecial || customer.esAgenteRetencion) && (
                        <div className="flex gap-1">
                          {customer.esContribuyenteEspecial && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              C.E.
                            </Badge>
                          )}
                          {customer.esAgenteRetencion && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              A.R.
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          {/* Leads Management */}
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(estadoConfig).map(([estado, config]) => {
              const leadsInEstado = leads.filter(lead => lead.estado === estado);
              return (
                <Card key={estado}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-sm ${config.color}`}>
                        {config.label}
                      </span>
                      <Badge variant="outline">{leadsInEstado.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leadsInEstado.map(lead => (
                      <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{lead.nombre}</div>
                              <div className="text-xs text-muted-foreground truncate">{lead.empresa}</div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => convertLeadToCustomer(lead)}
                                title="Convertir a cliente"
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-xs space-y-1">
                            {lead.telefono && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span className="truncate">{lead.telefono}</span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.valorEstimado > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatVES(lead.valorEstimado)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Seguimiento: {lead.proximoSeguimiento}</span>
                            </div>
                          </div>

                          {lead.notas && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {lead.notas}
                            </div>
                          )}

                          {/* Estado Actions */}
                          <div className="flex gap-1 pt-2">
                            {estado !== 'cerrado' && estado !== 'perdido' && (
                              <>
                                {estado === 'prospecto' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => updateLeadStatus(lead.id, 'contactado')}
                                  >
                                    Contactar
                                  </Button>
                                )}
                                {estado === 'contactado' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => updateLeadStatus(lead.id, 'interesado')}
                                  >
                                    Interesado
                                  </Button>
                                )}
                                {estado === 'interesado' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-2 py-1 h-6"
                                    onClick={() => updateLeadStatus(lead.id, 'negociacion')}
                                  >
                                    Negociar
                                  </Button>
                                )}
                                {estado === 'negociacion' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={() => updateLeadStatus(lead.id, 'cerrado')}
                                    >
                                      Cerrar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={() => updateLeadStatus(lead.id, 'perdido')}
                                    >
                                      Perdido
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    {leadsInEstado.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No hay leads en este estado
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

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

// Export with permission protection
export default function ProtectedCustomersPage() {
  const { canRead } = usePermissions();

  if (!canRead('clientes')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-muted-foreground">
            Acceso Restringido
          </div>
          <div className="text-sm text-muted-foreground">
            No tienes permisos para acceder al módulo de clientes
          </div>
        </div>
      </div>
    );
  }

  return <CustomersPage />;
}