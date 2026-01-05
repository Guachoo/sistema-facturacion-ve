import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Upload, Plus, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { RifInput } from '@/components/ui/rif-input';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { CompanySettings, ControlNumberBatch } from '@/types';

const companySchema = z.object({
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  domicilioFiscal: z.string().min(1, 'Domicilio fiscal es requerido'),
  telefonos: z.string().min(1, 'Teléfonos son requeridos'),
  email: z.string().email('Email inválido'),
  condicionesVenta: z.string().min(1, 'Condiciones de venta son requeridas'),
});

const batchSchema = z.object({
  rangeFrom: z.number().min(1, 'Número inicial debe ser mayor a 0'),
  rangeTo: z.number().min(1, 'Número final debe ser mayor a 0'),
});

type CompanyForm = z.infer<typeof companySchema>;
type BatchForm = z.infer<typeof batchSchema>;

// Mock data
const mockCompanySettings: CompanySettings = {
  razonSocial: 'Mi Empresa C.A.',
  rif: 'J-12345678-9',
  domicilioFiscal: 'Av. Principal, Edificio Torre, Piso 5, Oficina 501, Caracas 1050, Venezuela',
  telefonos: '+58-212-1234567 / +58-414-9876543',
  email: 'facturacion@miempresa.com',
  condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
};

const mockControlBatches: ControlNumberBatch[] = [
  {
    id: '1',
    rangeFrom: 2025001,
    rangeTo: 2025500,
    active: true,
    used: 127,
    remaining: 373,
  },
  {
    id: '2',
    rangeFrom: 2024501,
    rangeTo: 2025000,
    active: false,
    used: 500,
    remaining: 0,
  },
];

export function CompanySettingsPage() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(mockCompanySettings);
  const [controlBatches, setControlBatches] = useState<ControlNumberBatch[]>(mockControlBatches);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ControlNumberBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: companySettings,
  });

  const {
    register: registerBatch,
    handleSubmit: handleSubmitBatch,
    reset: resetBatch,
    formState: { errors: batchErrors },
  } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
  });

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Cargando configuración de empresa desde Supabase...');

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error al cargar configuración:', error);
        toast.error('Error al cargar la configuración de empresa');
        return;
      }

      if (data) {
        console.log('✅ Configuración cargada:', data);

        const settings: CompanySettings = {
          razonSocial: data.razon_social,
          rif: data.rif,
          domicilioFiscal: data.domicilio_fiscal,
          telefonos: data.telefonos,
          email: data.email,
          condicionesVenta: data.condiciones_venta,
        };

        setCompanySettings(settings);
        reset(settings); // Actualizar valores del formulario
      }
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
      toast.error('Error al cargar la configuración de empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitCompany = async (data: CompanyForm) => {
    try {
      setIsSaving(true);
      console.log('💾 Guardando configuración de empresa en Supabase...', data);

      const { error } = await supabase
        .from('company_settings')
        .update({
          razon_social: data.razonSocial,
          rif: data.rif,
          domicilio_fiscal: data.domicilioFiscal,
          telefonos: data.telefonos,
          email: data.email,
          condiciones_venta: data.condicionesVenta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1); // Asumiendo que solo hay una fila de configuración

      if (error) {
        console.error('❌ Error al guardar configuración:', error);
        toast.error('Error al guardar la configuración de empresa');
        return;
      }

      console.log('✅ Configuración guardada exitosamente');
      setCompanySettings(data);
      toast.success('Configuración de empresa actualizada correctamente');
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      toast.error('Error al guardar la configuración de empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitBatch = (data: BatchForm) => {
    if (data.rangeTo <= data.rangeFrom) {
      toast.error('El número final debe ser mayor al número inicial');
      return;
    }

    const newBatch: ControlNumberBatch = {
      id: Date.now().toString(),
      rangeFrom: data.rangeFrom,
      rangeTo: data.rangeTo,
      active: true,
      used: 0,
      remaining: data.rangeTo - data.rangeFrom + 1,
    };

    // Deactivate other batches
    const updatedBatches = controlBatches.map(batch => ({ ...batch, active: false }));
    setControlBatches([...updatedBatches, newBatch]);
    setIsBatchDialogOpen(false);
    resetBatch();
    toast.success('Lote de números de control creado correctamente');
  };

  const handleDeleteBatch = (id: string) => {
    setControlBatches(batches => batches.filter(batch => batch.id !== id));
    toast.success('Lote eliminado correctamente');
  };

  const handleActivateBatch = (id: string) => {
    setControlBatches(batches =>
      batches.map(batch => ({
        ...batch,
        active: batch.id === id,
      }))
    );
    toast.success('Lote activado correctamente');
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mock logo upload
      toast.success('Logo subido correctamente');
    }
  };

  // Mostrar loader mientras carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando configuración de empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Empresa</h1>
          <p className="text-muted-foreground">
            Gestiona los datos de tu empresa y números de control
          </p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">Datos de Empresa</TabsTrigger>
          <TabsTrigger value="control-numbers">Números de Control</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Datos que aparecerán en todas las facturas emitidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitCompany)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
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
                    <Label htmlFor="rif">RIF *</Label>
                    <RifInput
                      id="rif"
                      value={watch('rif') || ''}
                      onChange={(value) => setValue('rif', value)}
                    />
                    {errors.rif && (
                      <p className="text-sm text-destructive">{errors.rif.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domicilioFiscal">Domicilio Fiscal *</Label>
                  <Textarea
                    id="domicilioFiscal"
                    {...register('domicilioFiscal')}
                    rows={3}
                  />
                  {errors.domicilioFiscal && (
                    <p className="text-sm text-destructive">{errors.domicilioFiscal.message}</p>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefonos">Teléfonos *</Label>
                    <Input
                      id="telefonos"
                      {...register('telefonos')}
                      placeholder="+58-212-1234567 / +58-414-9876543"
                    />
                    {errors.telefonos && (
                      <p className="text-sm text-destructive">{errors.telefonos.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo de la Empresa</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Logo
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: JPG, PNG, SVG. Tamaño máximo: 2MB
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicionesVenta">Condiciones de Venta *</Label>
                  <Textarea
                    id="condicionesVenta"
                    {...register('condicionesVenta')}
                    rows={3}
                    placeholder="Ej: Pago de contado. Precios incluyen IVA. Válido por 30 días."
                  />
                  {errors.condicionesVenta && (
                    <p className="text-sm text-destructive">{errors.condicionesVenta.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Configuración'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control-numbers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Números de Control
                  </CardTitle>
                  <CardDescription>
                    Gestiona los lotes de números de control para facturas digitales
                  </CardDescription>
                </div>
                <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Lote
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Lote</DialogTitle>
                      <DialogDescription>
                        Define el rango de números de control para este lote
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitBatch(onSubmitBatch)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rangeFrom">Número Inicial *</Label>
                          <Input
                            id="rangeFrom"
                            type="number"
                            {...registerBatch('rangeFrom', { valueAsNumber: true })}
                            placeholder="2025001"
                          />
                          {batchErrors.rangeFrom && (
                            <p className="text-sm text-destructive">{batchErrors.rangeFrom.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rangeTo">Número Final *</Label>
                          <Input
                            id="rangeTo"
                            type="number"
                            {...registerBatch('rangeTo', { valueAsNumber: true })}
                            placeholder="2025500"
                          />
                          {batchErrors.rangeTo && (
                            <p className="text-sm text-destructive">{batchErrors.rangeTo.message}</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Crear Lote
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rango</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Utilizados</TableHead>
                    <TableHead>Disponibles</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controlBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No hay lotes de números de control configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    controlBatches.map((batch) => {
                      const total = batch.rangeTo - batch.rangeFrom + 1;
                      const usagePercentage = (batch.used / total) * 100;
                      
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono">
                            {batch.rangeFrom.toLocaleString()} - {batch.rangeTo.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={batch.active ? 'default' : 'secondary'}>
                              {batch.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {batch.used.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono">
                            {batch.remaining.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${usagePercentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {usagePercentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!batch.active && batch.remaining > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivateBatch(batch.id)}
                                >
                                  Activar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBatch(batch.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Información sobre Números de Control
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Los números de control son asignados por imprentas autorizadas por el SENIAT para 
                    facturas digitales. Cada factura debe tener un número de control único y consecutivo. 
                    Solo puede haber un lote activo a la vez.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}