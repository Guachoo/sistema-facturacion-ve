import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit, Trash2, Package, Download, Upload } from 'lucide-react';
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/api/items';
import { useBcvRate, useExchangeRates } from '@/api/rates';
import { MoneyInput } from '@/components/ui/money-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { EurRateBadge } from '@/components/ui/eur-rate-badge';
import { formatVES, formatUSD, formatEUR } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Item } from '@/types';

const itemSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  tipo: z.enum(['producto', 'servicio'], { message: 'Tipo es requerido' }),
  moneda: z.enum(['VES', 'USD', 'EUR']),
  precioUsd: z.number().optional(),
  precioEur: z.number().optional(),
  precioBase: z.number().min(0.01, 'Precio debe ser mayor a 0'),
  ivaAplica: z.boolean(),
});

type ItemForm = z.infer<typeof itemSchema>;

export function ItemsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: items = [], isLoading } = useItems();
  const { data: bcvRate } = useBcvRate();
  const { data: exchangeRates } = useExchangeRates();
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      ivaAplica: true,
      tipo: 'producto',
      moneda: 'VES',
    },
  });

  // Auto-convert USD/EUR to VES
  const moneda = watch('moneda');
  const tipo = watch('tipo');
  const precioUsd = watch('precioUsd');
  const precioEur = watch('precioEur');
  const precioBase = watch('precioBase');

  // Auto-suggest code based on type
  const handleTipoChange = (value: 'producto' | 'servicio') => {
    setValue('tipo', value);
    // Auto-suggest code prefix if creating new item
    if (!editingItem) {
      const prefix = value === 'producto' ? 'PROD-' : 'SERV-';
      const existingCodes = items
        .filter(item => item.tipo === value)
        .map(item => item.codigo)
        .filter(code => code.startsWith(prefix));

      const numbers = existingCodes
        .map(code => parseInt(code.replace(prefix, ''), 10))
        .filter(num => !isNaN(num));

      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const suggestedCode = `${prefix}${String(nextNumber).padStart(3, '0')}`;
      setValue('codigo', suggestedCode);
    }
  };

  // When currency is USD and price in USD changes, convert to VES
  const handlePrecioUsdChange = (value: number) => {
    setValue('precioUsd', value);
    if (bcvRate && moneda === 'USD') {
      setValue('precioBase', value * bcvRate.rate);
    }
  };

  // When currency is EUR and price in EUR changes, convert to VES
  const handlePrecioEurChange = (value: number) => {
    setValue('precioEur', value);
    if (exchangeRates && moneda === 'EUR') {
      setValue('precioBase', value * exchangeRates.eur);
    }
  };

  // When currency is VES, clear precioUsd and precioEur
  const handleMonedaChange = (value: 'VES' | 'USD' | 'EUR') => {
    setValue('moneda', value);
    if (value === 'VES') {
      setValue('precioUsd', undefined);
      setValue('precioEur', undefined);
    } else if (value === 'USD' && precioUsd && bcvRate) {
      setValue('precioBase', precioUsd * bcvRate.rate);
    } else if (value === 'EUR' && precioEur && exchangeRates) {
      setValue('precioBase', precioEur * exchangeRates.eur);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      item.codigo.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || item.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

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

  const handleExportCSV = () => {
    const csvContent = [
      ['Código', 'Descripción', 'Tipo', 'Precio Base (VES)', 'IVA Aplica'],
      ...filteredItems.map(item => [
        item.codigo,
        item.descripcion,
        item.tipo,
        item.precioBase.toString(),
        item.ivaAplica ? 'Sí' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `productos-servicios-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Archivo CSV exportado correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos y Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona tu catálogo de productos y servicios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Item' : 'Nuevo Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Modifica' : 'Completa'} la información del producto o servicio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                      onValueChange={(value) => handleTipoChange(value as 'producto' | 'servicio')}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    placeholder="Descripción del producto o servicio"
                  />
                  {errors.descripcion && (
                    <p className="text-sm text-destructive">{errors.descripcion.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda *</Label>
                  <Select
                    value={watch('moneda')}
                    onValueChange={(value) => handleMonedaChange(value as 'VES' | 'USD' | 'EUR')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VES">Bolívares (Bs)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                      <SelectItem value="EUR">Euros (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {moneda === 'USD' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="precioUsd">Precio en USD *</Label>
                        <BcvRateBadge />
                      </div>
                      <MoneyInput
                        value={watch('precioUsd') || 0}
                        onChange={handlePrecioUsdChange}
                        placeholder="0.00"
                      />
                      {errors.precioUsd && (
                        <p className="text-sm text-destructive">{errors.precioUsd.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="precioBase">Precio en Bs (Conversión Automática)</Label>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-lg font-mono font-semibold">
                          {formatVES(watch('precioBase') || 0)}
                        </p>
                        {bcvRate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatUSD(watch('precioUsd') || 0)} × {bcvRate.rate} = {formatVES(watch('precioBase') || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {moneda === 'EUR' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="precioEur">Precio en EUR *</Label>
                        <EurRateBadge />
                      </div>
                      <MoneyInput
                        value={watch('precioEur') || 0}
                        onChange={handlePrecioEurChange}
                        placeholder="0.00"
                      />
                      {errors.precioEur && (
                        <p className="text-sm text-destructive">{errors.precioEur.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="precioBase">Precio en Bs (Conversión Automática)</Label>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-lg font-mono font-semibold">
                          {formatVES(watch('precioBase') || 0)}
                        </p>
                        {exchangeRates && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatEUR(watch('precioEur') || 0)} × {exchangeRates.eur} = {formatVES(watch('precioBase') || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {moneda === 'VES' && (
                  <div className="space-y-2">
                    <Label htmlFor="precioBase">Precio en Bs *</Label>
                    <MoneyInput
                      value={watch('precioBase') || 0}
                      onChange={(value) => setValue('precioBase', value)}
                      placeholder="0,00"
                    />
                    {errors.precioBase && (
                      <p className="text-sm text-destructive">{errors.precioBase.message}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ivaAplica"
                    checked={watch('ivaAplica')}
                    onCheckedChange={(checked) =>
                      setValue('ivaAplica', checked as boolean)
                    }
                  />
                  <Label htmlFor="ivaAplica">
                    Aplica IVA
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingItem ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="producto">Productos</SelectItem>
                <SelectItem value="servicio">Servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter(item => item.tipo === 'producto').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter(item => item.tipo === 'servicio').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando productos y servicios...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No se encontraron productos o servicios
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.codigo}</TableCell>
                    <TableCell className="font-medium">{item.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant={item.tipo === 'producto' ? 'default' : 'secondary'}>
                        {item.tipo === 'producto' ? 'Producto' : 'Servicio'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.moneda || 'VES'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.moneda === 'USD' && item.precioUsd ? (
                        <div>
                          <div className="font-semibold text-blue-600">{formatUSD(item.precioUsd)}</div>
                          <div className="text-xs text-muted-foreground">{formatVES(item.precioBase)}</div>
                        </div>
                      ) : (
                        <div className="font-semibold">{formatVES(item.precioBase)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.ivaAplica ? (
                        <Badge variant="outline" className="text-green-600">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Exento
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar Item"
        description="¿Estás seguro de que deseas eliminar este producto/servicio? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
}