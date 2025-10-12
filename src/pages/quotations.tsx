import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button'; // 👈 agrega esta línea aquí
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
import {
  useQuotations,
  useCreateQuotation,
  useUpdateQuotation,
  useDeleteQuotation,
  useConvertQuotationToInvoice,
  useChangeQuotationStatus,
  useQuotationStats,
  useConvertQuotationToInvoiceAdvanced,
  canChangeStatus,
  getAvailableActions,
  type Quotation,
  type QuotationItem,
  type QuotationStatus,
  type QuotationStats
} from '@/api/quotations';
import { useCustomers } from '@/api/customers';
import { useItems } from '@/api/items';
import { formatVES } from '@/lib/formatters';



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
  const { data: customers = [] } = useCustomers();
  const { data: items = [], isLoading: itemsLoading } = useItems();

  // Debug: Log items data
  console.log('Items in QuotationForm:', items.length, items);

  const [formData, setFormData] = useState({
    cliente_id: quotation?.cliente_id || '',
    cliente_nombre: quotation?.cliente_nombre || '',
    cliente_email: quotation?.cliente_email || '',
    fecha_vencimiento: quotation?.fecha_vencimiento || '',
    observaciones: quotation?.observaciones || '',
    valida_hasta: quotation?.valida_hasta || '',
    estado: quotation?.estado || 'borrador',
    vendedor_id: '1', // TODO: Get from auth context
    vendedor_nombre: 'Usuario Actual' // TODO: Get from auth context
  });

  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>(
    quotation?.items || []
  );

  // Estado para búsqueda de productos
  const [searchStates, setSearchStates] = useState<{[key: string]: {
    isOpen: boolean;
    searchTerm: string;
  }}>({});
  const searchRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Calculate totals
  const subtotal = quotationItems.reduce((sum, item) => sum + item.total, 0);
  const descuentoGlobal = 0; // TODO: Add global discount functionality
  const baseGravable = subtotal - descuentoGlobal;
  const iva = baseGravable * 0.16; // 16% IVA
  const total = baseGravable + iva;

  const handleClienteChange = (clienteId: string) => {
    const cliente = customers.find(c => c.id === clienteId);
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nombre: cliente.razonSocial,
        cliente_email: cliente.email || ''
      }));
    }
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `temp-${Date.now()}`,
      quotation_id: quotation?.id || '',
      item_id: '',
      nombre: '',
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0,
      total: 0
    };
    setQuotationItems([...quotationItems, newItem]);
  };

  const removeItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  // Funciones para búsqueda de productos
  const getSearchState = (itemId: string) => {
    return searchStates[itemId] || { isOpen: false, searchTerm: '' };
  };

  const updateSearchState = (itemId: string, updates: Partial<{isOpen: boolean; searchTerm: string}>) => {
    setSearchStates(prev => ({
      ...prev,
      [itemId]: { ...getSearchState(itemId), ...updates }
    }));
  };

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(searchStates).forEach(itemId => {
        const ref = searchRefs.current[itemId];
        if (ref && !ref.contains(event.target as Node) && searchStates[itemId]?.isOpen) {
          updateSearchState(itemId, { isOpen: false });
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchStates]);

  // Filtrar productos según búsqueda
  const getFilteredItems = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      return items.filter(i => i.activo !== false);
    }

    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.activo !== false && (
        item.codigo?.toLowerCase().includes(term) ||
        item.descripcion?.toLowerCase().includes(term)
      )
    );
  };

  const selectProduct = (itemIndex: number, product: any) => {
    updateItem(itemIndex, 'item_id', product.id);
    updateItem(itemIndex, 'nombre', product.descripcion);
    updateItem(itemIndex, 'descripcion', product.descripcion);
    updateItem(itemIndex, 'precio_unitario', product.precioBase);

    // Recalcular total del item
    const cantidad = quotationItems[itemIndex]?.cantidad || 1;
    const descuento = quotationItems[itemIndex]?.descuento || 0;
    const nuevoTotal = (cantidad * product.precioBase) - descuento;
    updateItem(itemIndex, 'total', nuevoTotal);

    // Cerrar búsqueda
    updateSearchState(quotationItems[itemIndex].id, { isOpen: false, searchTerm: '' });
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...quotationItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If item was selected, populate data
    if (field === 'item_id' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          nombre: selectedItem.descripcion,
          descripcion: selectedItem.descripcion,
          precio_unitario: selectedItem.precioBase
        };
      }
    }

    // Recalculate item total
    const item = updatedItems[index];
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const itemDescuento = (itemSubtotal * item.descuento) / 100;
    item.total = itemSubtotal - itemDescuento;

    setQuotationItems(updatedItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quotationData = {
      ...formData,
      items: quotationItems,
      subtotal,
      descuento_global: descuentoGlobal,
      iva,
      total
    };

    onSubmit(quotationData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500 text-white rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Nueva Cotización
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Crea una nueva cotización para tu cliente
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client Information Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b">
            <CardTitle className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span>Información del Cliente</span>
            </CardTitle>
            <CardDescription>
              Selecciona el cliente y completa los datos necesarios
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cliente" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cliente *
                </Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={handleClienteChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="🔍 Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id!}>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.razonSocial}</span>
                          <span className="text-xs text-gray-500">{customer.rif}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.cliente_nombre && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Cliente seleccionado: {formData.cliente_nombre}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email del Cliente
                </Label>
                <Input
                  id="cliente_email"
                  type="email"
                  value={formData.cliente_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente_email: e.target.value }))}
                  placeholder="📧 email@cliente.com"
                  className="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>
  
          {/* Dates Section */}
  <Card className="overflow-hidden">
    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b">
      <CardTitle className="flex items-center space-x-2">
        <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
        <span>Fechas y Vigencia</span>
      </CardTitle>
      <CardDescription>
        Establece las fechas importantes para esta cotización
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha de Vencimiento *
          </Label>
          <Input
            id="fecha_vencimiento"
            type="date"
            value={formData.fecha_vencimiento}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
            required
            className="h-11"
          />
        </div>
  
        <div className="space-y-2">
          <Label htmlFor="valida_hasta" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Válida Hasta *
          </Label>
          <Input
            id="valida_hasta"
            type="date"
            value={formData.valida_hasta}
            onChange={(e) => setFormData(prev => ({ ...prev, valida_hasta: e.target.value }))}
            required
            className="h-11"
          />
        </div>
      </div>
    </CardContent>
  </Card>
  
  {/* Items Section */}
  <Card className="overflow-hidden">
    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span>Items de la Cotización</span>
          </CardTitle>
          <CardDescription>
            Agrega productos o servicios a la cotización
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Item
        </Button>
      </div>
    </CardHeader>
  
    <CardContent className="p-6">
      {quotationItems.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              No hay items agregados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Comienza agregando productos o servicios a tu cotización.
              Puedes buscar por código o nombre del producto.
            </p>
          </div>
          <Button
            type="button"
            onClick={addItem}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Primer Item
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {quotationItems.map((item, index) => (
            <Card key={item.id} className="p-6 border-l-4 border-l-blue-200 shadow-sm">
              {/* Header con número de item y botón eliminar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-600">Item #{index + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
  
              {/* Contenido del item */}
              <div className="space-y-6">
                {/* Producto/Servicio */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Producto/Servicio *</Label>
                  <div
                    className="relative"
                    ref={(el) => { searchRefs.current[item.id] = el; }}
                  >
                    {/* Buscador */}
                    <div className="relative">
                      <Input
                        placeholder={itemsLoading ? "Cargando productos..." : "Buscar por código o nombre..."}
                        value={getSearchState(item.id).searchTerm}
                        onChange={(e) => {
                          updateSearchState(item.id, { searchTerm: e.target.value, isOpen: true });
                        }}
                        onFocus={() => updateSearchState(item.id, { isOpen: true })}
                        disabled={itemsLoading}
                        className="pr-10"
                        autoComplete="off"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {getSearchState(item.id).searchTerm ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => updateSearchState(item.id, { searchTerm: '', isOpen: false })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
  
                    {/* Resultados */}
                    {getSearchState(item.id).isOpen && !itemsLoading && (
                      <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {(() => {
                          const filteredItems = getFilteredItems(getSearchState(item.id).searchTerm);
                          if (filteredItems.length === 0) {
                            return (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                {getSearchState(item.id).searchTerm
                                  ? `No se encontraron productos con "${getSearchState(item.id).searchTerm}"`
                                  : "No hay productos disponibles"}
                              </div>
                            );
                          }
                          return filteredItems.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                              onClick={() => selectProduct(index, product)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {product.codigo} - {product.descripcion}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Precio: {formatVES(product.precioBase)} | Tipo: {product.tipo}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
  
                    {/* Producto seleccionado */}
                    {item.item_id && (
                      <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                        <div className="font-medium">
                          {items.find(p => p.id === item.item_id)?.codigo} - {item.descripcion}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Precio base: {formatVES(item.precio_unitario)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
  
                {/* Cantidades y Precios */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <Label className="text-sm font-semibold text-gray-700 mb-4 block">Cantidades y Precios</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="text-center h-11"
                      />
                    </div>
  
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Precio Unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => updateItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="text-right h-11"
                      />
                    </div>
  
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Descuento %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.descuento}
                        onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)}
                        className="text-center h-11"
                      />
                    </div>
  
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Total</Label>
                      <Input
                        value={formatVES(item.total)}
                        readOnly
                        className="bg-green-50 border-green-200 text-green-800 font-semibold text-right h-11"
                      />
                    </div>
                  </div>
                </div>
  
                {/* Descripción Detallada */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Descripción Detallada</Label>
                  <Textarea
                    value={item.descripcion || ''}
                    onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                    rows={4}
                    placeholder="💬 Descripción detallada del producto o servicio, especificaciones, características adicionales..."
                    className="resize-none bg-white"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
  
          
          {/* Summary and Totals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Totals */}
            <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                <span>Resumen Financiero</span>
              </CardTitle>
              <CardDescription>
                Cálculo automático de totales con IVA incluido
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-lg">{formatVES(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IVA (16%):</span>
                  <span className="font-medium text-lg text-orange-600 dark:text-orange-400">{formatVES(iva)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg px-4 border">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatVES(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                <span>Observaciones</span>
              </CardTitle>
              <CardDescription>
                Notas adicionales sobre esta cotización
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="💭 Escribe aquí cualquier observación especial, términos y condiciones, o notas importantes para esta cotización..."
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <span>
                  {quotationItems.length === 0
                    ? "Agrega al menos un item para continuar"
                    : `${quotationItems.length} item${quotationItems.length !== 1 ? 's' : ''} agregado${quotationItems.length !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="min-w-[120px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || quotationItems.length === 0 || !formData.cliente_id}
                  className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : quotation ? 'Actualizar' : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Crear Cotización
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

// Main Quotations Page
const QuotationsPage: React.FC = () => {
  const { canWrite, canDelete } = usePermissions();

  // Hooks for API data
  const { data: quotations = [], isLoading: quotationsLoading } = useQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: items = [] } = useItems();
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuotationStats();

  // Mutations
  const createQuotationMutation = useCreateQuotation();
  const updateQuotationMutation = useUpdateQuotation();
  const deleteQuotationMutation = useDeleteQuotation();
  const convertQuotationMutation = useConvertQuotationToInvoice();
  const changeStatusMutation = useChangeQuotationStatus();
  const convertAdvancedMutation = useConvertQuotationToInvoiceAdvanced();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

  const handleCreateQuotation = async (data: any) => {
    try {
      await createQuotationMutation.mutateAsync(data);
      toast.success('Cotización creada correctamente');
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      toast.error(error.message || 'Error al crear cotización');
    }
  };

  const handleUpdateQuotation = async (data: any) => {
    if (!editingQuotation) return;

    try {
      await updateQuotationMutation.mutateAsync({ ...editingQuotation, ...data });
      toast.success('Cotización actualizada correctamente');
      setEditingQuotation(null);
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      toast.error(error.message || 'Error al actualizar cotización');
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotationMutation.mutateAsync(quotationId);
      toast.success('Cotización eliminada correctamente');
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      toast.error(error.message || 'Error al eliminar cotización');
    }
  };

  const handleConvertToInvoice = async (quotation: Quotation) => {
    try {
      await convertQuotationMutation.mutateAsync(quotation.id);
      toast.success('Cotización convertida a factura correctamente');
    } catch (error: any) {
      console.error('Error converting quotation:', error);
      toast.error(error.message || 'Error al convertir cotización');
    }
  };

  // Nuevas funciones para gestión de estados
  const handleChangeStatus = async (quotationId: string, newStatus: QuotationStatus, reason?: string) => {
    try {
      await changeStatusMutation.mutateAsync({
        quotationId,
        newStatus,
        reason
      });

      const statusLabels = {
        borrador: 'borrador',
        enviada: 'enviada',
        aprobada: 'aprobada',
        rechazada: 'rechazada',
        convertida: 'convertida'
      };

      toast.success(`Cotización ${statusLabels[newStatus]} correctamente`);
    } catch (error: any) {
      console.error('Error changing quotation status:', error);
      toast.error(error.message || 'Error al cambiar estado de cotización');
    }
  };

  const handleConvertToInvoiceAdvanced = async (quotationId: string) => {
    try {
      const result = await convertAdvancedMutation.mutateAsync(quotationId);
      toast.success(`Cotización convertida a factura #${result.invoiceId.slice(0, 8)} correctamente`);
    } catch (error: any) {
      console.error('Error converting quotation to invoice:', error);
      toast.error(error.message || 'Error al convertir cotización a factura');
    }
  };

  const handleQuotationAction = async (quotation: Quotation, actionKey: string) => {
    switch (actionKey) {
      case 'send':
        await handleChangeStatus(quotation.id, 'enviada');
        break;
      case 'approve':
        await handleChangeStatus(quotation.id, 'aprobada');
        break;
      case 'reject':
        const reason = prompt('Motivo del rechazo:');
        if (reason) {
          await handleChangeStatus(quotation.id, 'rechazada', reason);
        }
        break;
      case 'convert':
        await handleConvertToInvoiceAdvanced(quotation.id);
        break;
      case 'review':
        await handleChangeStatus(quotation.id, 'borrador');
        break;
      case 'edit':
        setEditingQuotation(quotation);
        break;
      case 'view':
        setViewingQuotation(quotation);
        break;
      default:
        console.warn('Unknown action:', actionKey);
    }
  };

  const handleChangeStatus_old = async (quotationId: string, newStatus: Quotation['estado']) => {
    try {
      const quotation = quotations.find(q => q.id === quotationId);
      if (!quotation) return;

      await updateQuotationMutation.mutateAsync({ ...quotation, estado: newStatus });
      toast.success('Estado actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Error al actualizar estado');
    }
  };

  // Computed stats as fallback (always works)
  const fallbackStats = {
    total: quotations.length,
    borradores: quotations.filter(q => q.estado === 'borrador').length,
    enviadas: quotations.filter(q => q.estado === 'enviada').length,
    aprobadas: quotations.filter(q => q.estado === 'aprobada').length,
    rechazadas: quotations.filter(q => q.estado === 'rechazada').length,
    convertidas: quotations.filter(q => q.estado === 'convertida').length,
    conversionRate: (() => {
      const enviadas = quotations.filter(q => q.estado === 'enviada').length;
      const aprobadas = quotations.filter(q => q.estado === 'aprobada').length;
      const convertidas = quotations.filter(q => q.estado === 'convertida').length;
      const totalProcesadas = enviadas + aprobadas + convertidas;
      return totalProcesadas > 0 ? (convertidas / totalProcesadas) * 100 : 0;
    })(),
      valor_total: quotations.reduce((sum, q) => {
      const total = Number(q.total) || 0; // convierte string o number a number
      return sum + total;
    }, 0)
  };

  // Debug: verificar datos de cotizaciones
  console.log('Quotations data:', quotations.map(q => ({ numero: q.numero, total: q.total, estado: q.estado })));
  console.log('Calculated fallbackStats:', fallbackStats);

  // Ensure displayStats is never undefined
  const displayStats = stats && typeof stats === 'object' && stats.total !== undefined
    ? stats
    : fallbackStats;

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

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold">{displayStats.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-gray-600">{displayStats.borradores}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Borradores</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-blue-600">{displayStats.enviadas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Enviadas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-green-600">{displayStats.aprobadas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Aprobadas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-red-600">{displayStats.rechazadas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Rechazadas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl font-bold text-purple-600">{displayStats.convertidas}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Convertidas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-sm sm:text-base font-bold text-green-600">
                {displayStats.conversionRate.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Tasa de Conversión</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-sm sm:text-base font-bold text-blue-600">
                {formatVES(displayStats.valor_total || 0)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Valor Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col">
              <div className="text-sm sm:text-base font-bold text-amber-600">
                {displayStats.total > 0 && displayStats.valor_total > 0
                  ? formatVES(displayStats.valor_total / displayStats.total)
                  : formatVES(0)
                }
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Valor Promedio</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table */}
<Card className="hidden md:block">
  <CardHeader>
    <CardTitle>Lista de Cotizaciones</CardTitle>
    <CardDescription>
      {quotations.length} cotización{quotations.length !== 1 ? "es" : ""} registrada
      {quotations.length !== 1 ? "s" : ""}
    </CardDescription>
  </CardHeader>

  <CardContent>
    {/* Mapas auxiliares (una vez por render) */}
    {(() => {
      // Iconos disponibles para las acciones
      const iconMap = {
        edit: Edit,
        send: Send,
        check: CheckCircle,
        x: XCircle,
        "file-text": FileText,
        refresh: RotateCcw,
        eye: FileText,
      } as const;

      // Mapa de variantes -> a literales aceptados por ButtonProps["variant"]
      const variantMap = {
        primary: "default",
        secondary: "ghost",
        success: "default",
        danger: "destructive",
        warning: "secondary",
        info: "ghost",
        // también puedes mapear directamente las válidas por si llegan tal cual
        default: "default",
        outline: "outline",
        link: "link",
        ghost: "ghost",
        destructive: "destructive",
        secondaryNative: "secondary", // por si usas alguna clave interna
      } as const satisfies Record<string, ButtonProps["variant"]>;

      return (
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
            {quotationsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Cargando cotizaciones...
                </TableCell>
              </TableRow>
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No se encontraron cotizaciones
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => {
                const statusInfo = statusConfig[quotation.estado];
                const StatusIcon = statusInfo.icon;

                return (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.numero}</TableCell>

                    <TableCell>
                      <div>
                        <div className="font-medium">{quotation.cliente_nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {quotation.cliente_email}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {new Date(quotation.fecha_creacion).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      {new Date(quotation.fecha_vencimiento).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatVES(quotation.total)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {getAvailableActions(quotation)
                          .slice(0, 3)
                          .map((action) => {
                            // Icono seguro
                            const IconComponent =
                              iconMap[action.icon as keyof typeof iconMap] ?? FileText;

                            // Variante segura (tipada a ButtonProps["variant"])
                            const safeVariant: ButtonProps["variant"] =
                              variantMap[action.variant as keyof typeof variantMap] ?? "ghost";

                            return (
                              <Button
                                key={action.key}
                                variant={safeVariant}
                                size="sm"
                                onClick={() =>
                                  handleQuotationAction(quotation, action.key)
                                }
                                title={action.label}
                                disabled={
                                  !canWrite("cotizaciones") &&
                                  (["edit", "send", "approve", "reject", "convert"] as const).includes(
                                    action.key as any
                                  )
                                }
                              >
                                <IconComponent className="h-4 w-4" />
                              </Button>
                            );
                          })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      );
    })()}
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
                      {getAvailableActions(quotation).slice(0, 2).map((action) => {
                        const iconMap = {
                          edit: Edit,
                          send: Send,
                          check: CheckCircle,
                          x: XCircle,
                          'file-text': FileText,
                          refresh: RotateCcw,
                          eye: FileText
                        };
                        const IconComponent = iconMap[action.icon as keyof typeof iconMap] || FileText;

                        return (
                          <Button
                            key={action.key}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuotationAction(quotation, action.key)}
                            title={action.label}
                            disabled={
                              !canWrite('cotizaciones') && ['edit', 'send', 'approve', 'reject', 'convert'].includes(action.key)
                            }
                          >
                            <IconComponent className="h-3 w-3" />
                          </Button>
                        );
                      })}
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

      {/* View Quotation Details Dialog */}
      <Dialog open={!!viewingQuotation} onOpenChange={() => setViewingQuotation(null)}>
        <DialogContent className="mx-4 sm:mx-auto w-[calc(100vw-2rem)] sm:w-auto max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Cotización</DialogTitle>
            <DialogDescription>
              Información completa de la cotización {viewingQuotation?.numero}
            </DialogDescription>
          </DialogHeader>

          {viewingQuotation && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número:</span>
                      <span className="font-medium">{viewingQuotation.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge className={statusConfig[viewingQuotation.estado].color}>
                        {statusConfig[viewingQuotation.estado].label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha creación:</span>
                      <span className="font-medium">
                        {viewingQuotation.fecha_creacion ?
                          new Date(viewingQuotation.fecha_creacion).toLocaleDateString('es-VE') :
                          'No definida'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Válida hasta:</span>
                      <span className="font-medium">
                        {viewingQuotation.valida_hasta ?
                          new Date(viewingQuotation.valida_hasta).toLocaleDateString('es-VE') :
                          'No definida'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-medium">{viewingQuotation.vendedor_nombre || 'No asignado'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{viewingQuotation.cliente_nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RIF:</span>
                      <span className="font-medium">{viewingQuotation.cliente_rif || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{viewingQuotation.cliente_email || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domicilio:</span>
                      <span className="font-medium text-right max-w-48 truncate">
                        {viewingQuotation.cliente_domicilio || 'No especificado'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Items Cotizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Descuento</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingQuotation.items && viewingQuotation.items.length > 0 ? (
                          viewingQuotation.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <div>
                                  <div>{item.nombre || item.descripcion}</div>
                                  {item.descripcion && item.nombre !== item.descripcion && (
                                    <div className="text-sm text-muted-foreground">{item.descripcion}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.cantidad}</TableCell>
                              <TableCell className="text-right">{formatVES(item.precio_unitario)}</TableCell>
                              <TableCell className="text-right">{formatVES(item.descuento || 0)}</TableCell>
                              <TableCell className="text-right font-medium">{formatVES(item.total)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No hay items en esta cotización
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatVES(viewingQuotation.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Descuento Global:</span>
                      <span className="font-medium">{formatVES(viewingQuotation.descuento_global || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA (16%):</span>
                      <span className="font-medium">{formatVES(viewingQuotation.iva || 0)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatVES(viewingQuotation.total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observations */}
              {viewingQuotation.observaciones && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Observaciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewingQuotation.observaciones}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {getAvailableActions(viewingQuotation).slice(1).map((action) => {
                  const iconMap = {
                    edit: Edit,
                    send: Send,
                    check: CheckCircle,
                    x: XCircle,
                    'file-text': FileText,
                    refresh: RotateCcw,
                    eye: FileText
                  };
                  const IconComponent = iconMap[action.icon as keyof typeof iconMap] || FileText;
                  const variantMap = {
                    primary: 'default',
                    secondary: 'ghost',
                    success: 'default',
                    danger: 'destructive',
                    warning: 'secondary',
                    info: 'ghost'
                  };

                  return (
                    <Button
                      key={action.key}
                      variant={variantMap[action.variant as keyof typeof variantMap] || 'ghost'}
                      size="sm"
                      onClick={() => {
                        handleQuotationAction(viewingQuotation, action.key);
                        setViewingQuotation(null);
                      }}
                      disabled={
                        !canWrite('cotizaciones') && ['edit', 'send', 'approve', 'reject', 'convert'].includes(action.key)
                      }
                    >
                      <IconComponent className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export with permission protection
export default withPermission(QuotationsPage, 'cotizaciones', 'leer');