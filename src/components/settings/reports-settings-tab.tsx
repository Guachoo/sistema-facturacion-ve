/**
 * Tab de Configuración de Reportes
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart3, FileText, Clock, Palette, Save, RotateCcw } from 'lucide-react';
import { useReportsSettings } from '@/hooks/use-settings';

export function ReportsSettingsTab() {
  const { reportsSettings, updateReportsSettings, isSaving } = useReportsSettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: reportsSettings
  });

  const onSubmit = (data: any) => {
    updateReportsSettings(data);
    reset(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Formato por Defecto</Label>
                <Select
                  value={watch('general.formatoDefault')}
                  onValueChange={(value) => setValue('general.formatoDefault', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Excel">Excel</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Logo en Reportes</Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir logo de la empresa
                  </p>
                </div>
                <Switch
                  checked={watch('general.logoEnReportes')}
                  onCheckedChange={(checked) => setValue('general.logoEnReportes', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pie de Reportes</Label>
              <Textarea
                {...register('general.pieReportes')}
                placeholder="Texto que aparecerá al final de los reportes"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reportes Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Ventas Diarias</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar reporte automático cada día
                  </p>
                </div>
                <Switch
                  checked={watch('automaticos.ventasDiarias.habilitado')}
                  onCheckedChange={(checked) => setValue('automaticos.ventasDiarias.habilitado', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Stock Bajo</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas de productos con stock bajo
                  </p>
                </div>
                <Switch
                  checked={watch('automaticos.stockBajo.habilitado')}
                  onCheckedChange={(checked) => setValue('automaticos.stockBajo.habilitado', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Reportes de estado de backup
                  </p>
                </div>
                <Switch
                  checked={watch('automaticos.backup.habilitado')}
                  onCheckedChange={(checked) => setValue('automaticos.backup.habilitado', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personalización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fuente Principal</Label>
                <Select
                  value={watch('personalizacion.fuentePrincipal')}
                  onValueChange={(value) => setValue('personalizacion.fuentePrincipal', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Calibri">Calibri</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tamaño de Fuente</Label>
                <Input
                  type="number"
                  {...register('personalizacion.tamañoFuente', { valueAsNumber: true })}
                  placeholder="12"
                  min="8"
                  max="24"
                />
              </div>
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