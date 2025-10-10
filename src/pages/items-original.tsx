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
import { MoneyInput } from '@/components/ui/money-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatVES } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Item } from '@/types';

const itemSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  tipo: z.enum(['producto', 'servicio'], { message: 'Tipo es requerido' }),
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
    },
  });

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Productos y Servicios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona tu catálogo de productos y servicios
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Item' : 'Nuevo Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Modifica' : 'Completa'} la información del producto o servicio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1 sm:px-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <Label htmlFor="precioBase">Precio Base (VES) *</Label>
                  <MoneyInput
                    value={watch('precioBase') || 0}
                    onChange={(value) => setValue('precioBase', value)}
                    placeholder="0,00"
                  />
                  {errors.precioBase && (
                    <p className="text-sm text-destructive">{errors.precioBase.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ivaAplica"
                    checked={watch('ivaAplica')}
                    onCheckedChange={(checked) =>
                      setValue('ivaAplica', checked as boolean)
                    }
                  />
                  <Label htmlFor="ivaAplica">
                    Aplica IVA (16%)
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
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Total Items</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{items.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Productos</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">
                  {items.filter(item => item.tipo === 'producto').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Servicios</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">
                  {items.filter(item => item.tipo === 'servicio').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando productos y servicios...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
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
                    <TableCell className="font-mono">
                      {formatVES(item.precioBase)}
                    </TableCell>
                    <TableCell>
                      {item.ivaAplica ? (
                        <Badge variant="outline" className="text-green-600">
                          16%
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

      {/* Cards - Mobile */}
      <div className="md:hidden grid grid-cols-2 gap-2 sm:gap-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                Cargando productos y servicios...
              </div>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                No se encontraron productos o servicios
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-2 sm:p-3">
                <div className="space-y-1 sm:space-y-2">
                  {/* Header compact */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-medium truncate">{item.codigo}</div>
                      <div className="text-xs font-semibold truncate" title={item.descripcion}>
                        {item.descripcion}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(item.id!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Type and price */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={item.tipo === 'producto' ? 'default' : 'secondary'}
                        className="text-xs px-1 py-0"
                      >
                        {item.tipo === 'producto' ? 'Prod' : 'Serv'}
                      </Badge>
                      <Badge
                        variant={item.ivaAplica ? 'default' : 'secondary'}
                        className="text-xs px-1 py-0"
                      >
                        {item.ivaAplica ? 'IVA' : 'Exento'}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono font-bold text-right">
                      {formatVES(item.precioBase)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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