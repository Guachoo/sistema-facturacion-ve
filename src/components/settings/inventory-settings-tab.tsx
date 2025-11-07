/**
 * Tab de Configuración de Inventario
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, QrCode, DollarSign, Save, RotateCcw } from 'lucide-react';
import { useInventorySettings } from '@/hooks/use-settings';

export function InventorySettingsTab() {
  const { inventorySettings, updateInventorySettings, isSaving } = useInventorySettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: inventorySettings
  });

  const onSubmit = (data: any) => {
    updateInventorySettings(data);
    reset(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Control de Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Método de Valuación</Label>
              <Select
                value={watch('stock.metodoValuacion')}
                onValueChange={(value) => setValue('stock.metodoValuacion', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIFO">FIFO (Primero en Entrar, Primero en Salir)</SelectItem>
                  <SelectItem value="LIFO">LIFO (Último en Entrar, Primero en Salir)</SelectItem>
                  <SelectItem value="PROMEDIO">Costo Promedio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Stock Mínimo Global</Label>
                <Input
                  type="number"
                  {...register('stock.stockMinimoGlobal', { valueAsNumber: true })}
                  placeholder="5"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Permitir Stock Negativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir vender sin stock
                  </p>
                </div>
                <Switch
                  checked={watch('stock.permitirStockNegativo')}
                  onCheckedChange={(checked) => setValue('stock.permitirStockNegativo', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Codificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>Código Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Generar códigos automáticamente
                </p>
              </div>
              <Switch
                checked={watch('codificacion.codigoAutomatico')}
                onCheckedChange={(checked) => setValue('codificacion.codigoAutomatico', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Formato de Código</Label>
              <Input
                {...register('codificacion.formatoCodigo')}
                placeholder="ITEM-{numero:6}"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty || isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button type="submit" disabled={!isDirty || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}