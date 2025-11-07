/**
 * Tab de Configuración de Facturación
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Hash, DollarSign, Save, RotateCcw } from 'lucide-react';
import { useBillingSettings } from '@/hooks/use-settings';

export function BillingSettingsTab() {
  const { billingSettings, updateBillingSettings, isSaving } = useBillingSettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: billingSettings
  });

  const onSubmit = (data: any) => {
    updateBillingSettings(data);
    reset(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Numeración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Serie Facturas</Label>
                <Input {...register('numeracion.facturas.serie')} placeholder="FAC" />
              </div>
              <div className="space-y-2">
                <Label>Próximo Número</Label>
                <Input type="number" {...register('numeracion.facturas.siguiente', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Formas de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(billingSettings.formasPago).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                </div>
                <Switch
                  checked={watch(`formasPago.${key}.habilitado`)}
                  onCheckedChange={(checked) => setValue(`formasPago.${key}.habilitado`, checked)}
                />
              </div>
            ))}
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