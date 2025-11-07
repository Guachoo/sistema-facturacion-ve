// Enhanced Customer Form with Phase 2 integrations
// RIF validation, TFHKA sync, audit trail

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Shield,
  Building2,
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  RefreshCw
} from 'lucide-react';
import { RifInput } from '@/components/ui/rif-input';
import { useValidateCustomerRif, useSyncCustomerWithTfhka, useCustomerAuditHistory } from '@/api/customers-extended';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Customer } from '@/types';

// Enhanced schema with Phase 2 fields
const enhancedCustomerSchema = z.object({
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  nombre: z.string().optional(),
  domicilio: z.string().min(1, 'Domicilio es requerido'),
  telefono: z.string().optional(),
  telefonoMovil: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipoContribuyente: z.enum(['especial', 'ordinario', 'formal'], { message: 'Tipo de contribuyente es requerido' }),
  contactoNombre: z.string().optional(),
  contactoCargo: z.string().optional(),
  sectorEconomico: z.string().optional(),
  activo: z.boolean().optional(),
});

type EnhancedCustomerForm = z.infer<typeof enhancedCustomerSchema>;

interface EnhancedCustomerFormProps {
  customer?: Customer;
  onSubmit: (data: EnhancedCustomerForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EnhancedCustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading = false
}: EnhancedCustomerFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  const [rifValidationResult, setRifValidationResult] = useState<any>(null);
  const [showTfhkaSync, setShowTfhkaSync] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [formProgress, setFormProgress] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<EnhancedCustomerForm>({
    resolver: zodResolver(enhancedCustomerSchema),
    defaultValues: {
      activo: true,
      ...customer
    }
  });

  const rifValue = watch('rif');

  // Phase 2 hooks
  const rifValidationMutation = useValidateCustomerRif();
  const tfhkaSyncMutation = useSyncCustomerWithTfhka();
  const { data: auditHistory, isLoading: auditLoading } = useCustomerAuditHistory(customer?.id);

  // Calculate form completion progress
  const formValues = watch();
  useEffect(() => {
    const requiredFields = ['rif', 'razonSocial', 'domicilio', 'tipoContribuyente'];
    const optionalFields = ['nombre', 'telefono', 'email', 'contactoNombre'];
    const allFields = [...requiredFields, ...optionalFields];

    const completedFields = allFields.filter(field => {
      const value = formValues[field as keyof EnhancedCustomerForm];
      return value && value.toString().trim() !== '';
    }).length;

    const progress = Math.round((completedFields / allFields.length) * 100);
    setFormProgress(progress);
  }, [formValues]);

  // Handle form reset with confirmation
  const handleResetForm = () => {
    reset({
      activo: true,
      rif: '',
      razonSocial: '',
      nombre: '',
      domicilio: '',
      telefono: '',
      telefonoMovil: '',
      email: '',
      tipoContribuyente: 'ordinario' as const,
      contactoNombre: '',
      contactoCargo: '',
      sectorEconomico: ''
    });
    setRifValidationResult(null);
    setShowTfhkaSync(false);
    toast.success('Formulario limpiado', {
      description: 'Todos los campos han sido reiniciados'
    });
  };

  useEffect(() => {
    if (customer) {
      Object.entries(customer).forEach(([key, value]) => {
        setValue(key as keyof EnhancedCustomerForm, value);
      });
    }
  }, [customer, setValue]);

  // Auto-validate RIF when it changes
  useEffect(() => {
    if (rifValue && rifValue.length >= 10) {
      const timeoutId = setTimeout(() => {
        rifValidationMutation.mutate(rifValue, {
          onSuccess: (result) => {
            setRifValidationResult(result);
            setShowTfhkaSync(result.isValid && (rifValue.startsWith('J-') || rifValue.startsWith('G-')));
          },
          onError: () => {
            setRifValidationResult(null);
            setShowTfhkaSync(false);
          }
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [rifValue, rifValidationMutation]);

  const handleTfhkaSync = () => {
    if (!rifValue) return;

    tfhkaSyncMutation.mutate(rifValue, {
      onSuccess: (syncedData) => {
        // Pre-fill form with TFHKA data
        if (syncedData.razonSocial) setValue('razonSocial', syncedData.razonSocial);
        if (syncedData.domicilio) setValue('domicilio', syncedData.domicilio);
        if (syncedData.telefono) setValue('telefono', syncedData.telefono);
        if (syncedData.email) setValue('email', syncedData.email);

        toast.success('Datos sincronizados con TFHKA', {
          description: 'La información se ha actualizado automáticamente'
        });
      },
      onError: (error: any) => {
        toast.error('Error en sincronización TFHKA', {
          description: error.message || 'No se pudo sincronizar con el servicio fiscal'
        });
      }
    });
  };

  const getRifStatusIcon = () => {
    if (rifValidationMutation.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (rifValidationResult?.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (rifValidationResult?.isValid === false) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getRifStatusBadge = () => {
    if (!rifValidationResult) return null;

    if (rifValidationResult.isValid) {
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          RIF Válido
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        RIF Inválido
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Form Progress Indicator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Progreso del Formulario</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{formProgress}%</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                className="h-7 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={formProgress} className="h-2" />
        </CardHeader>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información Básica
                </CardTitle>
                <CardDescription>
                  Datos principales del cliente con validación fiscal avanzada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* RIF with enhanced validation */}
                <div className="space-y-2">
                  <Label htmlFor="rif" className="flex items-center gap-2">
                    RIF *
                    {getRifStatusIcon()}
                  </Label>
                  <div className="flex gap-2">
                    <RifInput
                      id="rif"
                      value={rifValue || ''}
                      onChange={(value) => setValue('rif', value)}
                      className={rifValidationResult?.isValid === false ? 'border-red-500' : ''}
                    />
                    {showTfhkaSync && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTfhkaSync}
                        disabled={tfhkaSyncMutation.isPending}
                        className="shrink-0"
                      >
                        {tfhkaSyncMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        TFHKA
                      </Button>
                    )}
                  </div>

                  {/* RIF Validation Results */}
                  <div className="flex flex-wrap gap-2">
                    {getRifStatusBadge()}
                    {rifValidationResult?.details?.rifType && (
                      <Badge variant="outline">
                        {rifValidationResult.details.rifType}
                      </Badge>
                    )}
                  </div>

                  {/* RIF Suggestions */}
                  {rifValidationResult?.suggestions && rifValidationResult.suggestions.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Sugerencias de RIF</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {rifValidationResult.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {errors.rif && (
                    <p className="text-sm text-destructive">{errors.rif.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="razonSocial">Razón Social *</Label>
                    <Input
                      id="razonSocial"
                      {...register('razonSocial')}
                    />
                    {errors.razonSocial && (
                      <p className="text-sm text-destructive">{errors.razonSocial.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Comercial</Label>
                    <Input
                      id="nombre"
                      {...register('nombre')}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domicilio" className="flex items-center gap-2">
                    Domicilio Fiscal *
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddressDialog(true)}
                      className="h-5 w-5 p-0"
                    >
                      <MapPin className="h-3 w-3" />
                    </Button>
                  </Label>
                  <Input
                    id="domicilio"
                    {...register('domicilio')}
                    placeholder="Dirección completa registrada ante SENIAT"
                  />
                  {errors.domicilio && (
                    <p className="text-sm text-destructive">{errors.domicilio.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipoContribuyente">Tipo de Contribuyente *</Label>
                    <select
                      id="tipoContribuyente"
                      {...register('tipoContribuyente')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="especial">Contribuyente Especial</option>
                      <option value="ordinario">Contribuyente Ordinario</option>
                      <option value="formal">Régimen Simplificado</option>
                    </select>
                    {errors.tipoContribuyente && (
                      <p className="text-sm text-destructive">{errors.tipoContribuyente.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sectorEconomico">Sector Económico</Label>
                    <Input
                      id="sectorEconomico"
                      {...register('sectorEconomico')}
                      placeholder="ej. Tecnología, Servicios"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={watch('activo')}
                    onCheckedChange={(checked) => setValue('activo', checked)}
                  />
                  <Label htmlFor="activo">Cliente activo</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Información de Contacto
                </CardTitle>
                <CardDescription>
                  Datos de contacto y persona responsable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Teléfono Principal
                    </Label>
                    <Input
                      id="telefono"
                      {...register('telefono')}
                      placeholder="+58-212-1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefonoMovil">Teléfono Móvil</Label>
                    <Input
                      id="telefonoMovil"
                      {...register('telefonoMovil')}
                      placeholder="+58-414-1234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="cliente@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactoNombre">Persona de Contacto</Label>
                    <Input
                      id="contactoNombre"
                      {...register('contactoNombre')}
                      placeholder="Nombre del contacto principal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactoCargo">Cargo</Label>
                    <Input
                      id="contactoCargo"
                      {...register('contactoCargo')}
                      placeholder="ej. Gerente General"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Información Fiscal
                </CardTitle>
                <CardDescription>
                  Estado de validaciones y sincronización TFHKA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rifValidationResult && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Estado de Validación RIF</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Formato:</span>
                          {rifValidationResult.details?.isValidFormat ? (
                            <Badge variant="secondary" className="bg-green-50 text-green-700">Válido</Badge>
                          ) : (
                            <Badge variant="destructive">Inválido</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Dígito Verificador:</span>
                          {rifValidationResult.isValid ? (
                            <Badge variant="secondary" className="bg-green-50 text-green-700">Correcto</Badge>
                          ) : (
                            <Badge variant="destructive">Incorrecto</Badge>
                          )}
                        </div>
                        {rifValidationResult.details?.formattedRif && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">RIF Formateado:</span>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {rifValidationResult.details.formattedRif}
                            </code>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {showTfhkaSync && (
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertTitle>Sincronización TFHKA Disponible</AlertTitle>
                    <AlertDescription>
                      Este cliente empresarial puede sincronizarse con el sistema fiscal TFHKA.
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTfhkaSync}
                        disabled={tfhkaSyncMutation.isPending}
                        className="ml-2"
                      >
                        {tfhkaSyncMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sincronizar Datos
                          </>
                        )}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Auditoría
                </CardTitle>
                <CardDescription>
                  Registro de cambios y operaciones realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Cargando historial...</span>
                  </div>
                ) : auditHistory && auditHistory.length > 0 ? (
                  <div className="space-y-3">
                    {auditHistory.slice(0, 5).map((record: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{record.operation}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleString('es-VE')}
                          </p>
                          {record.notes && (
                            <p className="text-xs text-gray-600 mt-1">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay registros de auditoría disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {customer ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </DialogFooter>
        </form>
      </Tabs>

      {/* Address Validation Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Validación de Dirección
            </DialogTitle>
            <DialogDescription>
              Verifica que la dirección fiscal coincida con los registros oficiales
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Información Importante</AlertTitle>
              <AlertDescription>
                El domicilio fiscal debe coincidir exactamente con el registrado ante SENIAT.
                Cualquier discrepancia puede generar observaciones fiscales.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Dirección Actual</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {watch('domicilio') || 'No especificada'}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>• Incluye estado, municipio y código postal</p>
              <p>• Evita abreviaciones no oficiales</p>
              <p>• Verifica que coincida con el RIF</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressDialog(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}