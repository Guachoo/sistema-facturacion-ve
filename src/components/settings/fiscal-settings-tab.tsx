/**
 * Tab de Configuración Fiscal
 * Configuración SENIAT, impuestos y documentos fiscales
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Receipt,
  Shield,
  FileText,
  Calculator,
  Database,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useFiscalSettings } from '@/hooks/use-settings';

export function FiscalSettingsTab() {
  const { fiscalSettings, updateFiscalSettings, isSaving } = useFiscalSettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: fiscalSettings
  });

  const onSubmit = (data: any) => {
    updateFiscalSettings(data);
    reset(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Configuración SENIAT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configuración SENIAT Venezuela
            </CardTitle>
            <CardDescription>
              Configuración específica para la normativa fiscal venezolana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Contribuyente Especial</Label>
                  <p className="text-sm text-muted-foreground">
                    Designado por SENIAT como contribuyente especial
                  </p>
                </div>
                <Switch
                  checked={watch('seniat.contribuyenteEspecial')}
                  onCheckedChange={(checked) => setValue('seniat.contribuyenteEspecial', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Agente de Retención IVA</Label>
                  <p className="text-sm text-muted-foreground">
                    Autorizado para retener IVA a terceros
                  </p>
                </div>
                <Switch
                  checked={watch('seniat.agenteretencionIVA')}
                  onCheckedChange={(checked) => setValue('seniat.agenteretencionIVA', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Agente de Retención ISLR</Label>
                  <p className="text-sm text-muted-foreground">
                    Autorizado para retener ISLR
                  </p>
                </div>
                <Switch
                  checked={watch('seniat.agenteRetencionISLR')}
                  onCheckedChange={(checked) => setValue('seniat.agenteRetencionISLR', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Fiscales
            </CardTitle>
            <CardDescription>
              Configuración de numeración y formato de documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>Numeración Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Generar números automáticamente
                </p>
              </div>
              <Switch
                checked={watch('documentos.numeracionAutomatica')}
                onCheckedChange={(checked) => setValue('documentos.numeracionAutomatica', checked)}
              />
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Prefijo Facturas</Label>
                <Input
                  {...register('documentos.prefijos.facturas')}
                  placeholder="FAC"
                />
              </div>

              <div className="space-y-2">
                <Label>Prefijo Notas de Crédito</Label>
                <Input
                  {...register('documentos.prefijos.notasCredito')}
                  placeholder="NC"
                />
              </div>

              <div className="space-y-2">
                <Label>Prefijo Notas de Débito</Label>
                <Input
                  {...register('documentos.prefijos.notasDebito')}
                  placeholder="ND"
                />
              </div>

              <div className="space-y-2">
                <Label>Prefijo Cotizaciones</Label>
                <Input
                  {...register('documentos.prefijos.cotizaciones')}
                  placeholder="COT"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Formato de Fecha</Label>
              <Select
                value={watch('documentos.formatoFecha')}
                onValueChange={(value) => setValue('documentos.formatoFecha', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Impuestos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Impuestos
            </CardTitle>
            <CardDescription>
              Configuración de tasas de impuestos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>IVA General (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('impuestos.ivaGeneral', { valueAsNumber: true })}
                  placeholder="16"
                />
              </div>

              <div className="space-y-2">
                <Label>IVA Reducido (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('impuestos.ivaReducido', { valueAsNumber: true })}
                  placeholder="8"
                />
              </div>

              <div className="space-y-2">
                <Label>IGTF (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('impuestos.igtfPorcentaje', { valueAsNumber: true })}
                  placeholder="3"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Aplicar IGTF a Divisas</Label>
                  <p className="text-sm text-muted-foreground">
                    Aplicar automáticamente en pagos USD
                  </p>
                </div>
                <Switch
                  checked={watch('impuestos.aplicarIgtfDivisas')}
                  onCheckedChange={(checked) => setValue('impuestos.aplicarIgtfDivisas', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}