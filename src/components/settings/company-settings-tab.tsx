/**
 * Tab de Configuración de Empresa
 * Datos de la empresa, logos y branding
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Building2,
  Upload,
  Image,
  Palette,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Save,
  RotateCcw,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { RifInput } from '@/components/ui/rif-input';
import { useCompanySettings } from '@/hooks/use-settings';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  useControlNumberBatches,
  useCreateControlBatch,
  useToggleBatchStatus,
  useDeleteControlBatch
} from '@/hooks/use-control-numbers';

const companySchema = z.object({
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  domicilioFiscal: z.string().min(1, 'Domicilio fiscal es requerido'),
  telefonos: z.string().min(1, 'Teléfonos son requeridos'),
  email: z.string().email('Email inválido'),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  condicionesVenta: z.string().min(1, 'Condiciones de venta son requeridas'),
  avisoLegal: z.string().optional(),
  pie_factura: z.string().optional(),
  horarioAtencion: z.string().optional(),
  coloresCorporativos: z.object({
    primario: z.string(),
    secundario: z.string(),
    acento: z.string()
  }),
  redesSociales: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional()
  }).optional()
});

type CompanyForm = z.infer<typeof companySchema>;

export function CompanySettingsTab() {
  const { companySettings, updateCompanySettings, isSaving } = useCompanySettings();
  const [logoPreview, setLogoPreview] = useState<string | null>(companySettings.logo || null);
  const [logoSecundarioPreview, setLogoSecundarioPreview] = useState<string | null>(companySettings.logoSecundario || null);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<string>('');
  const [rangeTo, setRangeTo] = useState<string>('');

  // Refs for file inputs
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const logoSecundarioInputRef = React.useRef<HTMLInputElement>(null);

  // Control numbers from database
  const { data: controlBatches = [], isLoading: isLoadingBatches } = useControlNumberBatches();
  const createBatchMutation = useCreateControlBatch();
  const toggleStatusMutation = useToggleBatchStatus();
  const deleteBatchMutation = useDeleteControlBatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      ...companySettings,
      website: companySettings.website || '',
      avisoLegal: companySettings.avisoLegal || '',
      pie_factura: companySettings.pie_factura || '',
      horarioAtencion: companySettings.horarioAtencion || '',
      redesSociales: {
        facebook: companySettings.redesSociales?.facebook || '',
        instagram: companySettings.redesSociales?.instagram || '',
        twitter: companySettings.redesSociales?.twitter || '',
        linkedin: companySettings.redesSociales?.linkedin || ''
      }
    }
  });

  const coloresCorporativos = watch('coloresCorporativos');

  const onSubmit = (data: CompanyForm) => {
    const updatedData = {
      ...data,
      logo: logoPreview || undefined,
      logoSecundario: logoSecundarioPreview || undefined
    };
    updateCompanySettings(updatedData);
    reset(updatedData);
  };

  const handleLogoUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>, tipo: 'principal' | 'secundario') => {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Por favor selecciona un archivo de imagen válido (PNG, JPG)');
        event.target.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('El archivo no puede ser mayor a 2MB');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (tipo === 'principal') {
          setLogoPreview(result);
        } else {
          setLogoSecundarioPreview(result);
        }
      };
      reader.onerror = () => {
        toast.error('Error al cargar el archivo');
      };
      reader.readAsDataURL(file);
    }

    // Clear the input value to allow selecting the same file again
    event.target.value = '';
  }, []);

  const resetForm = () => {
    reset();
    setLogoPreview(companySettings.logo || null);
    setLogoSecundarioPreview(companySettings.logoSecundario || null);
  };

  // Funciones para manejo de lotes de números de control
  const handleCreateBatch = async () => {
    if (!rangeFrom || !rangeTo) {
      toast.error('Debe especificar el rango de números');
      return;
    }

    const from = parseInt(rangeFrom);
    const to = parseInt(rangeTo);

    if (from >= to) {
      toast.error('El número inicial debe ser menor que el final');
      return;
    }

    try {
      await createBatchMutation.mutateAsync({
        range_from: from,
        range_to: to,
        active: controlBatches.length === 0 // Activar automáticamente si es el primer lote
      });
      setIsBatchDialogOpen(false);
      setRangeFrom('');
      setRangeTo('');
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  const handleToggleBatchStatus = async (id: string, currentActive: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id, active: !currentActive });
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este lote? Esta acción no se puede deshacer.')) {
      try {
        await deleteBatchMutation.mutateAsync(id);
      } catch (error) {
        // Error ya manejado por el hook
      }
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos Básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información Básica
            </CardTitle>
            <CardDescription>
              Datos principales de la empresa que aparecerán en documentos fiscales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="razonSocial">Razón Social *</Label>
                <Input
                  id="razonSocial"
                  {...register('razonSocial')}
                  placeholder="Empresa C.A."
                />
                {errors.razonSocial && (
                  <p className="text-sm text-destructive">{errors.razonSocial.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rif">RIF *</Label>
                <RifInput
                  {...register('rif')}
                  placeholder="J-12345678-9"
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
                placeholder="Dirección completa del domicilio fiscal"
                rows={3}
              />
              {errors.domicilioFiscal && (
                <p className="text-sm text-destructive">{errors.domicilioFiscal.message}</p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefonos" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfonos *
                </Label>
                <Input
                  id="telefonos"
                  {...register('telefonos')}
                  placeholder="+58 212 123-4567, +58 414 123-4567"
                />
                {errors.telefonos && (
                  <p className="text-sm text-destructive">{errors.telefonos.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contacto@empresa.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Sitio Web
                </Label>
                <Input
                  id="website"
                  type="url"
                  {...register('website')}
                  placeholder="https://www.empresa.com"
                />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioAtencion">Horario de Atención</Label>
                <Input
                  id="horarioAtencion"
                  {...register('horarioAtencion')}
                  placeholder="Lun-Vie 8:00AM - 5:00PM"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logos y Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logos y Branding
            </CardTitle>
            <CardDescription>
              Logos de la empresa y colores corporativos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Logo Principal */}
              <div className="space-y-4">
                <Label>Logo Principal</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoPreview}
                        alt="Logo principal"
                        className="max-h-24 mx-auto object-contain"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            logoInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLogoPreview(null);
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500">Subir logo principal</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logoInputRef.current?.click();
                        }}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'principal')}
                    className="absolute -left-9999px opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos: PNG, JPG. Tamaño máximo: 2MB
                </p>
              </div>

              {/* Logo Secundario */}
              <div className="space-y-4">
                <Label>Logo Secundario</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoSecundarioPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoSecundarioPreview}
                        alt="Logo secundario"
                        className="max-h-24 mx-auto object-contain"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            logoSecundarioInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLogoSecundarioPreview(null);
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500">Subir logo secundario</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logoSecundarioInputRef.current?.click();
                        }}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                  )}
                  <input
                    ref={logoSecundarioInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'secundario')}
                    className="absolute -left-9999px opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Opcional. Para facturas especiales
                </p>
              </div>
            </div>

            <Separator />

            {/* Colores Corporativos */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colores Corporativos
              </Label>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="colorPrimario">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="colorPrimario"
                      type="color"
                      {...register('coloresCorporativos.primario')}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={coloresCorporativos.primario}
                      onChange={(e) => setValue('coloresCorporativos.primario', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorSecundario">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="colorSecundario"
                      type="color"
                      {...register('coloresCorporativos.secundario')}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={coloresCorporativos.secundario}
                      onChange={(e) => setValue('coloresCorporativos.secundario', e.target.value)}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorAccent">Color Acento</Label>
                  <div className="flex gap-2">
                    <Input
                      id="colorAccent"
                      type="color"
                      {...register('coloresCorporativos.acento')}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={coloresCorporativos.acento}
                      onChange={(e) => setValue('coloresCorporativos.acento', e.target.value)}
                      placeholder="#f59e0b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información Adicional
            </CardTitle>
            <CardDescription>
              Texto que aparecerá en facturas y documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="condicionesVenta">Condiciones de Venta *</Label>
              <Textarea
                id="condicionesVenta"
                {...register('condicionesVenta')}
                placeholder="Condiciones generales de venta y términos de pago"
                rows={3}
              />
              {errors.condicionesVenta && (
                <p className="text-sm text-destructive">{errors.condicionesVenta.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="avisoLegal">Aviso Legal</Label>
              <Textarea
                id="avisoLegal"
                {...register('avisoLegal')}
                placeholder="Texto legal que aparecerá en documentos oficiales"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pie_factura">Pie de Factura</Label>
              <Textarea
                id="pie_factura"
                {...register('pie_factura')}
                placeholder="Texto que aparecerá al final de las facturas"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card>
          <CardHeader>
            <CardTitle>Redes Sociales</CardTitle>
            <CardDescription>
              Enlaces a redes sociales de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  {...register('redesSociales.facebook')}
                  placeholder="https://facebook.com/empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  {...register('redesSociales.instagram')}
                  placeholder="https://instagram.com/empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  {...register('redesSociales.twitter')}
                  placeholder="https://twitter.com/empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-700" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  {...register('redesSociales.linkedin')}
                  placeholder="https://linkedin.com/company/empresa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Números de Control */}
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rangeFrom">Número Inicial *</Label>
                        <Input
                          id="rangeFrom"
                          type="number"
                          placeholder="2025001"
                          value={rangeFrom}
                          onChange={(e) => setRangeFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rangeTo">Número Final *</Label>
                        <Input
                          id="rangeTo"
                          type="number"
                          placeholder="2025500"
                          value={rangeTo}
                          onChange={(e) => setRangeTo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateBatch}
                      disabled={createBatchMutation.isPending}
                    >
                      {createBatchMutation.isPending ? 'Creando...' : 'Crear Lote'}
                    </Button>
                  </DialogFooter>
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
                {isLoadingBatches ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Cargando números de control...
                    </TableCell>
                  </TableRow>
                ) : controlBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No hay lotes de números de control configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  controlBatches.map((batch) => {
                    const total = batch.range_to - batch.range_from + 1;
                    const usagePercentage = (batch.used / total) * 100;

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono">
                          {batch.range_from.toLocaleString()} - {batch.range_to.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={batch.active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleBatchStatus(batch.id, batch.active)}
                          >
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
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  usagePercentage >= 90 ? 'bg-red-600' :
                                  usagePercentage >= 75 ? 'bg-yellow-600' :
                                  'bg-blue-600'
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(usagePercentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleBatchStatus(batch.id, batch.active)}
                              disabled={toggleStatusMutation.isPending}
                              title={batch.active ? 'Desactivar lote' : 'Activar lote'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch.id)}
                              disabled={deleteBatchMutation.isPending || batch.used > 0}
                              title={batch.used > 0 ? 'No se puede eliminar un lote con números usados' : 'Eliminar lote'}
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={!isDirty || isSaving}
            className="sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar Cambios
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || isSaving}
            className="sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}