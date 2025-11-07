import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUp,
  ArrowDown,
  History
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/api/items';
import { useInventoryMovements, useCreateInventoryMovement, useInventoryStats, useInventoryAlerts } from '@/api/inventory';
import { usePriceFormatter } from '@/hooks/use-price-formatter';
import { MoneyInput } from '@/components/ui/money-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatUSD, formatVES } from '@/lib/formatters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Item, InventoryMovement } from '@/types';

// Enhanced schema with inventory fields
const itemSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  tipo: z.enum(['producto', 'servicio'], { message: 'Tipo es requerido' }),
  precioBase: z.number().min(0.01, 'Precio debe ser mayor a 0'),
  ivaAplica: z.boolean(),
  stockMinimo: z.number().min(0, 'Stock mínimo debe ser mayor o igual a 0').optional(),
  stockMaximo: z.number().min(0, 'Stock máximo debe ser mayor o igual a 0').optional(),
  costoPromedio: z.number().min(0, 'Costo debe ser mayor o igual a 0').optional(),
  ubicacion: z.string().optional(),
  categoria: z.string().optional(),
  activo: z.boolean().optional(),
});

const movementSchema = z.object({
  itemId: z.string().min(1, 'Producto es requerido'),
  tipo: z.enum(['entrada', 'salida', 'ajuste', 'merma'], { message: 'Tipo es requerido' }),
  cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  costoUnitario: z.number().min(0, 'Costo debe ser mayor o igual a 0').optional(),
  motivo: z.string().min(1, 'Motivo es requerido'),
  referencia: z.string().optional(),
});

type ItemForm = z.infer<typeof itemSchema>;
type MovementForm = z.infer<typeof movementSchema>;

const USD_REFERENCE_THRESHOLD = 10;

export function EnhancedItemsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('inventory');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<Item | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: items = [], isLoading, error } = useItems();
  const { data: inventoryStats } = useInventoryStats();
  const { data: inventoryAlerts = [] } = useInventoryAlerts();
  const { data: movements = [] } = useInventoryMovements();
  const { usdToVes, bcvRate: currentBcvRate } = usePriceFormatter();
  const effectiveBcvRate = currentBcvRate || 224.38;

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const createMovementMutation = useCreateInventoryMovement();

  // Item form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      ivaAplica: true,
      activo: true,
    },
  });

  // Movement form
  const {
    register: registerMovement,
    handleSubmit: handleSubmitMovement,
    formState: { errors: movementErrors },
    reset: resetMovement,
    setValue: setMovementValue,
    watch: watchMovement,
  } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
  });

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.tipo === filterType;
    const matchesCategory = filterCategory === 'all' || item.categoria === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(items.map(item => item.categoria).filter(Boolean)));

  // Calculate inventory metrics
  const lowStockItems = items.filter(item =>
    item.tipo === 'producto' &&
    item.stockActual !== undefined &&
    item.stockMinimo !== undefined &&
    item.stockActual <= item.stockMinimo
  );

  const outOfStockItems = items.filter(item =>
    item.tipo === 'producto' &&
    (item.stockActual === undefined || item.stockActual <= 0)
  );

  const inventoryTotals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.tipo !== 'producto') {
          return acc;
        }

        const stock = item.stockActual ?? 0;
        if (!stock) {
          return acc;
        }

        const priceVes = item.precioBase ?? 0;
        const costVes = item.costoPromedio ?? priceVes;
        const usdPrice = item.precioUsd ?? 0;
        const hasUsdReference = usdPrice > 0 && priceVes > 0;
        const historicalRate = hasUsdReference ? priceVes / usdPrice : 0;
        const canRescale = historicalRate > USD_REFERENCE_THRESHOLD;

        const unitUsd = canRescale
          ? costVes / historicalRate
          : effectiveBcvRate > 0
            ? costVes / effectiveBcvRate
            : 0;

        const unitVes = canRescale
          ? usdToVes(unitUsd, effectiveBcvRate)
          : costVes;

        acc.totalInventoryValue += unitVes * stock;
        acc.totalInventoryValueUsd += unitUsd * stock;
        return acc;
      },
      { totalInventoryValue: 0, totalInventoryValueUsd: 0 }
    );
  }, [items, usdToVes, effectiveBcvRate]);

  const totalInventoryValue = inventoryTotals.totalInventoryValue;
  const totalInventoryValueUsd = inventoryTotals.totalInventoryValueUsd;

  const onSubmit = (data: ItemForm) => {
    if (editingItem) {
      updateMutation.mutate(
        { ...data, id: editingItem.id },
        {
          onSuccess: () => {
            toast.success('Producto/Servicio actualizado correctamente');
            handleCloseDialog();
          },
          onError: () => {
            toast.error('Error al actualizar el producto/servicio');
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Producto/Servicio creado correctamente');
          handleCloseDialog();
        },
        onError: () => {
          toast.error('Error al crear el producto/servicio');
        },
      });
    }
  };

  const onSubmitMovement = (data: MovementForm) => {
    const item = items.find(i => i.id === data.itemId);
    if (!item) return;

    const currentStock = item.stockActual || 0;
    let newStock = currentStock;

    switch (data.tipo) {
      case 'entrada':
        newStock = currentStock + data.cantidad;
        break;
      case 'salida':
        newStock = Math.max(0, currentStock - data.cantidad);
        break;
      case 'ajuste':
        newStock = data.cantidad;
        break;
      case 'merma':
        newStock = Math.max(0, currentStock - data.cantidad);
        break;
    }

    const movement: Omit<InventoryMovement, 'id' | 'createdAt'> = {
      ...data,
      usuarioId: '1', // Get from auth context
      fecha: new Date().toISOString(),
      stockAnterior: currentStock,
      stockNuevo: newStock,
    };

    createMovementMutation.mutate(movement, {
      onSuccess: () => {
        toast.success('Movimiento de inventario registrado correctamente');
        setIsMovementDialogOpen(false);
        resetMovement();
        setSelectedItemForMovement(null);
      },
      onError: () => {
        toast.error('Error al registrar el movimiento');
      },
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    reset();
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    Object.entries(item).forEach(([key, value]) => {
      setValue(key as keyof ItemForm, value);
    });
    setIsDialogOpen(true);
  };

  const handleAddMovement = (item: Item) => {
    setSelectedItemForMovement(item);
    setMovementValue('itemId', item.id!);
    setIsMovementDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete, {
        onSuccess: () => {
          toast.success('Producto/Servicio eliminado correctamente');
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        },
        onError: () => {
          toast.error('Error al eliminar el producto/servicio');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Control completo de productos, servicios y movimientos de inventario
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Item' : 'Nuevo Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Modifica' : 'Completa'} la información del producto o servicio incluyendo datos de inventario.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      {...register('codigo')}
                      placeholder="PROD-001"
                    />
                    {errors.codigo && (
                      <p className="text-sm text-destructive">{errors.codigo.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={watch('tipo')}
                      onValueChange={(value) => setValue('tipo', value as 'producto' | 'servicio')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producto">Producto</SelectItem>
                        <SelectItem value="servicio">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.tipo && (
                      <p className="text-sm text-destructive">{errors.tipo.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <Input
                    id="descripcion"
                    {...register('descripcion')}
                    placeholder="Nombre del producto o servicio"
                  />
                  {errors.descripcion && (
                    <p className="text-sm text-destructive">{errors.descripcion.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio Base (VES) *</Label>
                    <MoneyInput
                      value={watch('precioBase') || 0}
                      onChange={(value) => setValue('precioBase', value)}
                      placeholder="0.00"
                    />
                    {errors.precioBase && (
                      <p className="text-sm text-destructive">{errors.precioBase.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Costo Promedio (VES)</Label>
                    <MoneyInput
                      value={watch('costoPromedio') || 0}
                      onChange={(value) => setValue('costoPromedio', value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Inventory Fields - Only for products */}
                {watch('tipo') === 'producto' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                        <Input
                          id="stockMinimo"
                          type="number"
                          {...register('stockMinimo', { valueAsNumber: true })}
                          placeholder="10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stockMaximo">Stock Máximo</Label>
                        <Input
                          id="stockMaximo"
                          type="number"
                          {...register('stockMaximo', { valueAsNumber: true })}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ubicacion">Ubicación</Label>
                        <Input
                          id="ubicacion"
                          {...register('ubicacion')}
                          placeholder="Almacén A"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoría</Label>
                        <Input
                          id="categoria"
                          {...register('categoria')}
                          placeholder="Electrónicos"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ivaAplica"
                      checked={watch('ivaAplica')}
                      onCheckedChange={(checked) => setValue('ivaAplica', checked as boolean)}
                    />
                    <Label htmlFor="ivaAplica">Aplica IVA</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="activo"
                      checked={watch('activo')}
                      onCheckedChange={(checked) => setValue('activo', checked as boolean)}
                    />
                    <Label htmlFor="activo">Activo</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Total Items</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{items.length}</div>
                <p className="text-xs text-muted-foreground">
                  {items.filter(i => i.tipo === 'producto').length} productos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Valor Inventario</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{formatVES(totalInventoryValue)}</div>
                <p className="text-xs text-muted-foreground">
                  ≈ {formatUSD(totalInventoryValueUsd)} @ BCV {effectiveBcvRate.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Stock Bajo</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  Requieren reposición
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Sin Stock</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{outOfStockItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  Agotados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {inventoryAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="font-medium">{alert.descripcion}</div>
                      <div className="text-sm text-muted-foreground">
                        Stock actual: {alert.stockActual} | Mínimo: {alert.stockMinimo}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const item = items.find(i => i.id === alert.itemId);
                      if (item) handleAddMovement(item);
                    }}
                  >
                    Agregar Stock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">
            <Package className="mr-2 h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="mr-2 h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Lista de Inventario</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar por código o nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const item = items.find(i => i.tipo === 'producto');
                        if (item) handleAddMovement(item);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Movimiento
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.descripcion}</div>
                            {item.categoria && (
                              <div className="text-sm text-muted-foreground">{item.categoria}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.tipo === 'producto' ? 'default' : 'secondary'}>
                            {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.tipo === 'producto' ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{item.stockActual || 0}</span>
                              {item.stockActual !== undefined && item.stockMinimo !== undefined && (
                                <Badge
                                  variant={
                                    item.stockActual <= 0 ? 'destructive' :
                                    item.stockActual <= item.stockMinimo ? 'outline' : 'secondary'
                                  }
                                  className={
                                    item.stockActual <= 0 ? '' :
                                    item.stockActual <= item.stockMinimo ? 'border-yellow-500 text-yellow-700' : ''
                                  }
                                >
                                  {item.stockActual <= 0 ? 'Agotado' :
                                   item.stockActual <= item.stockMinimo ? 'Bajo' : 'OK'}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{formatVES(item.precioBase)}</TableCell>
                        <TableCell>
                          <Badge variant={item.activo ? 'default' : 'secondary'}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {item.tipo === 'producto' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddMovement(item)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid gap-3">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.descripcion}</div>
                            <div className="text-sm text-muted-foreground font-mono">{item.codigo}</div>
                          </div>
                          <Badge variant={item.tipo === 'producto' ? 'default' : 'secondary'}>
                            {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Precio</div>
                            <div className="font-mono">{formatVES(item.precioBase)}</div>
                          </div>
                          {item.tipo === 'producto' && (
                            <div>
                              <div className="text-muted-foreground">Stock</div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{item.stockActual || 0}</span>
                                {item.stockActual !== undefined && item.stockMinimo !== undefined && (
                                  <Badge
                                    variant={
                                      item.stockActual <= 0 ? 'destructive' :
                                      item.stockActual <= item.stockMinimo ? 'outline' : 'secondary'
                                    }
                                    className={cn(
                                      "text-xs",
                                      item.stockActual <= 0 ? '' :
                                      item.stockActual <= item.stockMinimo ? 'border-yellow-500 text-yellow-700' : ''
                                    )}
                                  >
                                    {item.stockActual <= 0 ? 'Agotado' :
                                     item.stockActual <= item.stockMinimo ? 'Bajo' : 'OK'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge variant={item.activo ? 'default' : 'secondary'}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <div className="flex gap-1">
                            {item.tipo === 'producto' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleAddMovement(item)}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(item.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>
                Historial de entradas, salidas y ajustes de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay movimientos de inventario registrados
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movements.slice(0, 10).map((movement) => {
                      const item = items.find(i => i.id === movement.itemId);
                      return (
                        <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              movement.tipo === 'entrada' ? 'bg-green-100 text-green-600' :
                              movement.tipo === 'salida' ? 'bg-red-100 text-red-600' :
                              movement.tipo === 'ajuste' ? 'bg-blue-100 text-blue-600' :
                              'bg-yellow-100 text-yellow-600'
                            )}>
                              {movement.tipo === 'entrada' ? <ArrowUp className="h-4 w-4" /> :
                               movement.tipo === 'salida' ? <ArrowDown className="h-4 w-4" /> :
                               <Edit className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium">{item?.descripcion}</div>
                              <div className="text-sm text-muted-foreground">
                                {movement.motivo} • {new Date(movement.fecha).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {movement.tipo === 'entrada' ? '+' : '-'}{movement.cantidad}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Stock: {movement.stockNuevo}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de Inventario</CardTitle>
              <CardDescription>
                Análisis y reportes del estado del inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                <div className="text-lg font-medium">Reportes Avanzados</div>
                <div>Próximamente: Valorización, Rotación, Análisis ABC</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Movimiento de Inventario</DialogTitle>
            <DialogDescription>
              Registra entrada, salida o ajuste de stock para {selectedItemForMovement?.descripcion}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMovement(onSubmitMovement)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="movementTipo">Tipo de Movimiento *</Label>
                <Select
                  value={watchMovement('tipo')}
                  onValueChange={(value) => setMovementValue('tipo', value as 'entrada' | 'salida' | 'ajuste' | 'merma')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="merma">Merma</SelectItem>
                  </SelectContent>
                </Select>
                {movementErrors.tipo && (
                  <p className="text-sm text-destructive">{movementErrors.tipo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="movementCantidad">Cantidad *</Label>
                <Input
                  id="movementCantidad"
                  type="number"
                  step="0.01"
                  {...registerMovement('cantidad', { valueAsNumber: true })}
                  placeholder="0"
                />
                {movementErrors.cantidad && (
                  <p className="text-sm text-destructive">{movementErrors.cantidad.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movementMotivo">Motivo *</Label>
              <Input
                id="movementMotivo"
                {...registerMovement('motivo')}
                placeholder="Descripción del movimiento"
              />
              {movementErrors.motivo && (
                <p className="text-sm text-destructive">{movementErrors.motivo.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="movementCosto">Costo Unitario (VES)</Label>
                <MoneyInput
                  value={watchMovement('costoUnitario') || 0}
                  onChange={(value) => setMovementValue('costoUnitario', value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="movementReferencia">Referencia</Label>
                <Input
                  id="movementReferencia"
                  {...registerMovement('referencia')}
                  placeholder="PO-001, FAC-123, etc."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMovementDialogOpen(false);
                  resetMovement();
                  setSelectedItemForMovement(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? 'Registrando...' : 'Registrar Movimiento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Eliminar Item"
        description="¿Estás seguro de que quieres eliminar este item? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}

export default EnhancedItemsPage;
