/**
 * Tab de Configuración de Sistema
 * Apariencia, seguridad e integraciones
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
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Palette,
  Shield,
  Wifi,
  Globe,
  Clock,
  Zap,
  Lock,
  Eye,
  Save,
  RotateCcw,
  TestTube
} from 'lucide-react';
import { useSystemSettings } from '@/hooks/use-settings';

export function SystemSettingsTab() {
  const { systemSettings, updateSystemSettings, isSaving } = useSystemSettings();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: systemSettings
  });

  const onSubmit = (data: any) => {
    updateSystemSettings(data);
    reset(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Apariencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Configuración de tema, idioma y formato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={watch('apariencia.tema')}
                  onValueChange={(value) => setValue('apariencia.tema', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claro">Claro</SelectItem>
                    <SelectItem value="oscuro">Oscuro</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={watch('apariencia.idioma')}
                  onValueChange={(value) => setValue('apariencia.idioma', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda Principal</Label>
                <Select
                  value={watch('apariencia.monedaPrincipal')}
                  onValueChange={(value) => setValue('apariencia.monedaPrincipal', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VES">Bolívares (VES)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select
                  value={watch('apariencia.zonaHoraria')}
                  onValueChange={(value) => setValue('apariencia.zonaHoraria', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Caracas">America/Caracas (VET)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europe/Madrid (CET)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Configuración de seguridad y autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tiempo de Sesión (minutos)</Label>
                <Input
                  type="number"
                  {...register('seguridad.sesionTiempo', { valueAsNumber: true })}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label>Intentos Máximos de Login</Label>
                <Input
                  type="number"
                  {...register('seguridad.intentosLoginMax', { valueAsNumber: true })}
                  placeholder="3"
                />
              </div>

              <div className="space-y-2">
                <Label>Tiempo de Bloqueo (minutos)</Label>
                <Input
                  type="number"
                  {...register('seguridad.bloqueoTiempo', { valueAsNumber: true })}
                  placeholder="15"
                />
              </div>

              <div className="space-y-2">
                <Label>Longitud Mínima de Contraseña</Label>
                <Input
                  type="number"
                  {...register('seguridad.passwordMinLength', { valueAsNumber: true })}
                  placeholder="8"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Autenticación de Dos Factores</Label>
                  <p className="text-sm text-muted-foreground">
                    Requerir 2FA para todos los usuarios
                  </p>
                </div>
                <Switch
                  checked={watch('seguridad.require2FA')}
                  onCheckedChange={(checked) => setValue('seguridad.require2FA', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Log de Actividad</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar todas las acciones
                  </p>
                </div>
                <Switch
                  checked={watch('seguridad.logActividad')}
                  onCheckedChange={(checked) => setValue('seguridad.logActividad', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integraciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Integraciones
            </CardTitle>
            <CardDescription>
              Configuración de servicios externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* BCV */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Banco Central de Venezuela (BCV)
                </Label>
                <Switch
                  checked={watch('integraciones.bcv.habilitado')}
                  onCheckedChange={(checked) => setValue('integraciones.bcv.habilitado', checked)}
                />
              </div>

              {watch('integraciones.bcv.habilitado') && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label>Frecuencia de Actualización (horas)</Label>
                    <Input
                      type="number"
                      {...register('integraciones.bcv.frecuenciaActualizacion', { valueAsNumber: true })}
                      placeholder="24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fuente de Datos</Label>
                    <Select
                      value={watch('integraciones.bcv.fuente')}
                      onValueChange={(value) => setValue('integraciones.bcv.fuente', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bcv.org.ve">BCV Oficial</SelectItem>
                        <SelectItem value="dolartoday">DolarToday</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* SENIAT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>SENIAT</Label>
                <Switch
                  checked={watch('integraciones.seniat.habilitado')}
                  onCheckedChange={(checked) => setValue('integraciones.seniat.habilitado', checked)}
                />
              </div>

              {watch('integraciones.seniat.habilitado') && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label>URL del Servicio</Label>
                    <Input
                      {...register('integraciones.seniat.urlServicio')}
                      placeholder="https://api.seniat.gob.ve"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timeout (ms)</Label>
                    <Input
                      type="number"
                      {...register('integraciones.seniat.timeoutMs', { valueAsNumber: true })}
                      placeholder="30000"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* TFHKA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>TFHKA</Label>
                <Switch
                  checked={watch('integraciones.tfhka.habilitado')}
                  onCheckedChange={(checked) => setValue('integraciones.tfhka.habilitado', checked)}
                />
              </div>

              {watch('integraciones.tfhka.habilitado') && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label>URL del Servicio</Label>
                    <Input
                      {...register('integraciones.tfhka.urlServicio')}
                      placeholder="https://tfhka.seniat.gob.ve"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rendimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rendimiento
            </CardTitle>
            <CardDescription>
              Configuración de performance del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Elementos por Página</Label>
                <Input
                  type="number"
                  {...register('rendimiento.paginacionTablas', { valueAsNumber: true })}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout de Requests (ms)</Label>
                <Input
                  type="number"
                  {...register('rendimiento.timeoutRequests', { valueAsNumber: true })}
                  placeholder="30000"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Cache de Documentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Mejorar velocidad de carga
                  </p>
                </div>
                <Switch
                  checked={watch('rendimiento.cacheDocumentos')}
                  onCheckedChange={(checked) => setValue('rendimiento.cacheDocumentos', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Compresión de Imágenes</Label>
                  <p className="text-sm text-muted-foreground">
                    Reducir tamaño automáticamente
                  </p>
                </div>
                <Switch
                  checked={watch('rendimiento.compressionImagenes')}
                  onCheckedChange={(checked) => setValue('rendimiento.compressionImagenes', checked)}
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