import React, { useState } from 'react';
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle, Clock, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { withPermission, usePermissions } from '@/hooks/use-permissions';

// Types for Quotations
interface QuotationItem {
  id: string;
  item_id: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  total: number;
}

interface Quotation {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_email: string;
  fecha_creacion: string;
  fecha_vencimiento: string;
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'convertida';
  subtotal: number;
  descuento_global: number;
  iva: number;
  total: number;
  observaciones?: string;
  items: QuotationItem[];
  vendedor_id: string;
  vendedor_nombre: string;
  valida_hasta?: string;
}

// Mock data for development
const mockQuotations: Quotation[] = [
  {
    id: '1',
    numero: 'COT-2024-001',
    cliente_id: '1',
    cliente_nombre: 'Empresa ABC',
    cliente_email: 'contacto@empresaabc.com',
    fecha_creacion: '2024-01-15',
    fecha_vencimiento: '2024-02-15',
    estado: 'enviada',
    subtotal: 1000,
    descuento_global: 50,
    iva: 152,
    total: 1102,
    observaciones: 'Cotización para proyecto de desarrollo web',
    vendedor_id: '1',
    vendedor_nombre: 'Juan Pérez',
    valida_hasta: '2024-02-15',
    items: [
      {
        id: '1',
        item_id: '1',
        nombre: 'Desarrollo Web',
        descripcion: 'Sitio web corporativo',
        cantidad: 1,
        precio_unitario: 1000,
        descuento: 0,
        total: 1000
      }
    ]
  },
  {
    id: '2',
    numero: 'COT-2024-002',
    cliente_id: '2',
    cliente_nombre: 'Comercial XYZ',
    cliente_email: 'ventas@comercialxyz.com',
    fecha_creacion: '2024-01-20',
    fecha_vencimiento: '2024-02-20',
    estado: 'aprobada',
    subtotal: 2500,
    descuento_global: 100,
    iva: 384,
    total: 2784,
    vendedor_id: '1',
    vendedor_nombre: 'Juan Pérez',
    valida_hasta: '2024-02-20',
    items: []
  }
];

// Status configuration
const statusConfig = {
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Edit },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Send },
  aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
  convertida: { label: 'Convertida', color: 'bg-purple-100 text-purple-800', icon: RotateCcw }
};

// Quotation Form Component
interface QuotationFormProps {
  quotation?: Quotation;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const QuotationForm: React.FC<QuotationFormProps> = ({
  quotation,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    cliente_nombre: quotation?.cliente_nombre || '',
    cliente_email: quotation?.cliente_email || '',
    fecha_vencimiento: quotation?.fecha_vencimiento || '',
    observaciones: quotation?.observaciones || '',
    valida_hasta: quotation?.valida_hasta || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cliente_nombre">Cliente</Label>
          <Input
            id="cliente_nombre"
            value={formData.cliente_nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, cliente_nombre: e.target.value }))}
            placeholder="Nombre del cliente"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente_email">Email del Cliente</Label>
          <Input
            id="cliente_email"
            type="email"
            value={formData.cliente_email}
            onChange={(e) => setFormData(prev => ({ ...prev, cliente_email: e.target.value }))}
            placeholder="email@cliente.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
          <Input
            id="fecha_vencimiento"
            type="date"
            value={formData.fecha_vencimiento}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valida_hasta">Válida Hasta</Label>
          <Input
            id="valida_hasta"
            type="date"
            value={formData.valida_hasta}
            onChange={(e) => setFormData(prev => ({ ...prev, valida_hasta: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
          placeholder="Notas adicionales sobre la cotización..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : quotation ? 'Actualizar' : 'Crear Cotización'}
        </Button>
      </div>
    </form>
  );
};

// Main Quotations Page
const QuotationsPage: React.FC = () => {
  const { canWrite, canDelete } = usePermissions();
  const [quotations] = useState<Quotation[]>(mockQuotations);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  const handleCreateQuotation = async (data: any) => {
    try {
      console.log('Creating quotation:', data);
      toast.success('Cotización creada correctamente');
      setIsCreateDialogOpen(false);
    } catch {
      toast.error('Error al crear cotización');
    }
  };

  const handleUpdateQuotation = async (data: any) => {
    if (!editingQuotation) return;

    try {
      console.log('Updating quotation:', data);
      toast.success('Cotización actualizada correctamente');
      setEditingQuotation(null);
    } catch {
      toast.error('Error al actualizar cotización');
    }
  };

  const handleConvertToInvoice = async (quotation: Quotation) => {
    try {
      console.log('Converting to invoice:', quotation.id);
      toast.success('Cotización convertida a factura correctamente');
    } catch {
      toast.error('Error al convertir cotización');
    }
  };

  const handleChangeStatus = async (quotationId: string, newStatus: Quotation['estado']) => {
    try {
      console.log('Changing status:', quotationId, newStatus);
      toast.success('Estado actualizado correctamente');
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  // Statistics
  const stats = {
    total: quotations.length,
    borradores: quotations.filter(q => q.estado === 'borrador').length,
    enviadas: quotations.filter(q => q.estado === 'enviada').length,
    aprobadas: quotations.filter(q => q.estado === 'aprobada').length,
    convertidas: quotations.filter(q => q.estado === 'convertida').length,
    valor_total: quotations.reduce((sum, q) => sum + q.total, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona cotizaciones y conviértelas en facturas
          </p>
        </div>
        {canWrite('cotizaciones') && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold">{stats.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-gray-600">{stats.borradores}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Borradores</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.enviadas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Enviadas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-green-600">{stats.aprobadas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Aprobadas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.convertidas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Convertidas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-sm sm:text-base font-bold">
                {new Intl.NumberFormat('es-VE', {
                  style: 'currency',
                  currency: 'VES'
                }).format(stats.valor_total)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Valor Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
          <CardDescription>
            {quotations.length} cotización{quotations.length !== 1 ? 'es' : ''} registrada{quotations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => {
                const statusInfo = statusConfig[quotation.estado];
                const StatusIcon = statusInfo.icon;

                return (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.numero}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quotation.cliente_nombre}</div>
                        <div className="text-sm text-muted-foreground">{quotation.cliente_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(quotation.fecha_creacion).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(quotation.fecha_vencimiento).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('es-VE', {
                        style: 'currency',
                        currency: 'VES'
                      }).format(quotation.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {canWrite('cotizaciones') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuotation(quotation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {quotation.estado === 'aprobada' && canWrite('facturas') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvertToInvoice(quotation)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden grid grid-cols-1 gap-3 sm:gap-4">
        {quotations.map((quotation) => {
          const statusInfo = statusConfig[quotation.estado];
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{quotation.numero}</div>
                      <div className="text-xs text-muted-foreground">{quotation.cliente_nombre}</div>
                    </div>
                    <div className="flex gap-1 ml-1">
                      {canWrite('cotizaciones') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingQuotation(quotation)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {quotation.estado === 'aprobada' && canWrite('facturas') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleConvertToInvoice(quotation)}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Status and Amount */}
                  <div className="flex items-center justify-between">
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                    <div className="text-sm font-bold">
                      {new Intl.NumberFormat('es-VE', {
                        style: 'currency',
                        currency: 'VES'
                      }).format(quotation.total)}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground">
                    <div>Creada: {new Date(quotation.fecha_creacion).toLocaleDateString()}</div>
                    <div>Vence: {new Date(quotation.fecha_vencimiento).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Quotation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cotización</DialogTitle>
            <DialogDescription>
              Crea una nueva cotización para tu cliente
            </DialogDescription>
          </DialogHeader>
          <QuotationForm
            onSubmit={handleCreateQuotation}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Quotation Dialog */}
      <Dialog open={!!editingQuotation} onOpenChange={() => setEditingQuotation(null)}>
        <DialogContent className="mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cotización</DialogTitle>
            <DialogDescription>
              Modifica los datos de la cotización
            </DialogDescription>
          </DialogHeader>
          {editingQuotation && (
            <QuotationForm
              quotation={editingQuotation}
              onSubmit={handleUpdateQuotation}
              onCancel={() => setEditingQuotation(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export with permission protection
export default withPermission(QuotationsPage, 'cotizaciones', 'leer');