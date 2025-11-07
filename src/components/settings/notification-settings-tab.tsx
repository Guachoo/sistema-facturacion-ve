/**
 * Tab de Configuración de Notificaciones
 * Email, alertas y comunicaciones
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Mail,
  Smartphone,
  Settings,
  AlertTriangle,
  Volume2,
  Save,
  RotateCcw,
  TestTube,
  CheckCircle
} from 'lucide-react';
import { useNotificationSettings } from '@/hooks/use-settings';
import { useTestEmailConnection } from '@/hooks/use-email-service';
import { toast } from 'sonner';

export function NotificationSettingsTab() {
  const { notificationSettings, updateNotificationSettings, isSaving } = useNotificationSettings();
  const testEmailMutation = useTestEmailConnection();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: notificationSettings
  });

  const onSubmit = (data: any) => {
    updateNotificationSettings(data);
    reset(data);
  };

  const testEmailConnection = async () => {
    await testEmailMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Configuración de Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración de Email
            </CardTitle>
            <CardDescription>
              Configuración del servidor SMTP para envío de emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>Habilitar Email</Label>
                <p className="text-sm text-muted-foreground">
                  Activar envío automático de emails
                </p>
              </div>
              <Switch
                checked={watch('email.habilitado')}
                onCheckedChange={(checked) => setValue('email.habilitado', checked)}
              />
            </div>

            {watch('email.habilitado') && (
              <>
                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Servidor SMTP</Label>
                    <Input
                      {...register('email.servidor.smtp_host')}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Puerto</Label>
                    <Input
                      type="number"
                      {...register('email.servidor.smtp_port', { valueAsNumber: true })}
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input
                      {...register('email.servidor.smtp_usuario')}
                      placeholder="usuario@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      {...register('email.servidor.smtp_password')}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label>SSL</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar conexión SSL
                      </p>
                    </div>
                    <Switch
                      checked={watch('email.servidor.ssl')}
                      onCheckedChange={(checked) => setValue('email.servidor.ssl', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label>TLS</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar conexión TLS
                      </p>
                    </div>
                    <Switch
                      checked={watch('email.servidor.tls')}
                      onCheckedChange={(checked) => setValue('email.servidor.tls', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Copia Oculta (BCC)</Label>
                  <Input
                    {...register('email.copiaOculta')}
                    placeholder="admin@empresa.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Opcional. Email que recibirá copia de todos los envíos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Firma de Email</Label>
                  <Textarea
                    {...register('email.firmaEmail')}
                    placeholder="Gracias por confiar en nosotros"
                    rows={3}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={testEmailConnection}
                  disabled={testEmailMutation.isPending}
                  className="w-full"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {testEmailMutation.isPending ? 'Probando Conexión...' : 'Probar Conexión'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Alertas del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas del Sistema
            </CardTitle>
            <CardDescription>
              Configuración de notificaciones automáticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Alertas de Bajo Stock</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar cuando productos tengan stock bajo
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.alertasBajoStock')}
                  onCheckedChange={(checked) => setValue('sistema.alertasBajoStock', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Alertas de Vencimiento</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre documentos próximos a vencer
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.alertasVencimiento')}
                  onCheckedChange={(checked) => setValue('sistema.alertasVencimiento', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Alertas Fiscales</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre problemas fiscales
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.alertasFiscales')}
                  onCheckedChange={(checked) => setValue('sistema.alertasFiscales', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Alertas de Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre estado de respaldos
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.alertasBackup')}
                  onCheckedChange={(checked) => setValue('sistema.alertasBackup', checked)}
                />
              </div>

              {/* FASE 6: Envío Automático de Emails */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Envío Automático de Facturas
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar facturas por email automáticamente al generarlas
                  </p>
                </div>
                <Switch
                  checked={watch('email.envioAutomatico')}
                  onCheckedChange={(checked) => setValue('email.envioAutomatico', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Notificaciones de Cambio de Estado</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar automáticamente cambios en el estado de documentos
                  </p>
                </div>
                <Switch
                  checked={watch('email.notificacionesCambioEstado')}
                  onCheckedChange={(checked) => setValue('email.notificacionesCambioEstado', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Recordatorios de Pago</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar recordatorios automáticos para facturas vencidas
                  </p>
                </div>
                <Switch
                  checked={watch('email.recordatoriosPago')}
                  onCheckedChange={(checked) => setValue('email.recordatoriosPago', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label>Notificaciones de Escritorio</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar notificaciones en el navegador
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.notificacionesEscritorio')}
                  onCheckedChange={(checked) => setValue('sistema.notificacionesEscritorio', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Sonidos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Reproducir sonidos para notificaciones
                  </p>
                </div>
                <Switch
                  checked={watch('sistema.sonidos')}
                  onCheckedChange={(checked) => setValue('sistema.sonidos', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plantillas de Email */}
        <Card>
          <CardHeader>
            <CardTitle>Plantillas de Email</CardTitle>
            <CardDescription>
              Personalizar el contenido de los emails automáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plantilla de Factura</Label>
                <Textarea
                  {...register('email.plantillas.facturaEmail')}
                  placeholder="Estimado cliente, adjuntamos su factura..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Recordatorio de Pago</Label>
                <Textarea
                  {...register('email.plantillas.recordatorioPago')}
                  placeholder="Le recordamos que tiene facturas pendientes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Nota de Crédito</Label>
                <Textarea
                  {...register('email.plantillas.notaCreditoEmail')}
                  placeholder="Adjuntamos su nota de crédito..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Reporte Diario</Label>
                <Textarea
                  {...register('email.plantillas.reporteDiario')}
                  placeholder="Resumen de ventas del día..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp (Futuro) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              WhatsApp
              <Badge variant="secondary">Próximamente</Badge>
            </CardTitle>
            <CardDescription>
              Configuración para notificaciones por WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Esta funcionalidad estará disponible en próximas versiones</p>
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