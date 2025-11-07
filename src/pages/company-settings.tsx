import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Upload, Plus, Edit, Trash2, FileText, Globe, Settings2, CheckCircle2 } from 'lucide-react';
import { RifInput } from '@/components/ui/rif-input';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import type { CompanySettings, ControlNumberBatch } from '@/types';

// FASE 8: Esquemas extendidos para multi-empresa
const companySchema = z.object({
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  domicilioFiscal: z.string().min(1, 'Domicilio fiscal es requerido'),
  telefonos: z.string().min(1, 'Teléfonos son requeridos'),
  email: z.string().email('Email inválido'),
  condicionesVenta: z.string().min(1, 'Condiciones de venta son requeridas'),
  tipo: z.enum(['principal', 'sucursal']).default('principal'),
  empresaPadreRif: z.string().optional(),
  series: z.array(z.string()).default(['A']),
  activa: z.boolean().default(true),
});

const batchSchema = z.object({
  rangeFrom: z.number().min(1, 'Número inicial debe ser mayor a 0'),
  rangeTo: z.number().min(1, 'Número final debe ser mayor a 0'),
  empresaRif: z.string().min(1, 'Debe seleccionar una empresa'),
  serie: z.string().min(1, 'Serie es requerida'),
});

const serieSchema = z.object({
  serie: z.string().min(1, 'Serie es requerida').max(5, 'Serie no puede tener más de 5 caracteres'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  empresaRif: z.string().min(1, 'Debe seleccionar una empresa'),
});

type CompanyForm = z.infer<typeof companySchema>;
type BatchForm = z.infer<typeof batchSchema>;
type SerieForm = z.infer<typeof serieSchema>;

// Tipos extendidos para multi-empresa
interface MultiCompanySettings extends CompanySettings {
  id: string;
  tipo: 'principal' | 'sucursal';
  empresaPadreRif?: string;
  series: string[];
  activa: boolean;
}

interface ControlNumberBatchMulti extends ControlNumberBatch {
  empresaRif: string;
  serie: string;
  empresaNombre: string;
}

interface SerieConfiguration {
  id: string;
  serie: string;
  descripcion: string;
  empresaRif: string;
  empresaNombre: string;
  activa: boolean;
}

// FASE 8: Mock data para multi-empresa
const mockMultiCompanies: MultiCompanySettings[] = [
  {
    id: '1',
    razonSocial: 'Corporación Principal C.A.',
    rif: 'J-12345678-9',
    domicilioFiscal: 'Av. Principal, Edificio Torre, Piso 5, Oficina 501, Caracas 1050, Venezuela',
    telefonos: '+58-212-1234567 / +58-414-9876543',
    email: 'facturacion@principal.com',
    condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
    tipo: 'principal',
    series: ['A', 'B', 'FAC'],
    activa: true,
  },
  {
    id: '2',
    razonSocial: 'Sucursal Valencia C.A.',
    rif: 'J-87654321-0',
    domicilioFiscal: 'Zona Industrial Norte, Valencia, Carabobo 2001, Venezuela',
    telefonos: '+58-241-9876543 / +58-424-1234567',
    email: 'valencia@principal.com',
    condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
    tipo: 'sucursal',
    empresaPadreRif: 'J-12345678-9',
    series: ['VAL', 'V'],
    activa: true,
  },
  {
    id: '3',
    razonSocial: 'Filial Maracaibo S.A.',
    rif: 'J-11223344-5',
    domicilioFiscal: 'Av. 5 de Julio, Centro Comercial Las Delicias, Maracaibo 4001, Venezuela',
    telefonos: '+58-261-5556666 / +58-426-7778888',
    email: 'maracaibo@principal.com',
    condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
    tipo: 'sucursal',
    empresaPadreRif: 'J-12345678-9',
    series: ['MAR', 'M'],
    activa: false, // Inactiva para mostrar ejemplo
  },
];

const mockControlBatchesMulti: ControlNumberBatchMulti[] = [
  {
    id: '1',
    rangeFrom: 2025001,
    rangeTo: 2025500,
    active: true,
    used: 127,
    remaining: 373,
    empresaRif: 'J-12345678-9',
    serie: 'A',
    empresaNombre: 'Corporación Principal C.A.',
  },
  {
    id: '2',
    rangeFrom: 2025501,
    rangeTo: 2025800,
    active: false,
    used: 45,
    remaining: 255,
    empresaRif: 'J-87654321-0',
    serie: 'VAL',
    empresaNombre: 'Sucursal Valencia C.A.',
  },
  {
    id: '3',
    rangeFrom: 2024501,
    rangeTo: 2025000,
    active: false,
    used: 500,
    remaining: 0,
    empresaRif: 'J-12345678-9',
    serie: 'FAC',
    empresaNombre: 'Corporación Principal C.A.',
  },
];

const mockSeriesConfig: SerieConfiguration[] = [
  {
    id: '1',
    serie: 'A',
    descripcion: 'Serie Principal Facturas',
    empresaRif: 'J-12345678-9',
    empresaNombre: 'Corporación Principal C.A.',
    activa: true,
  },
  {
    id: '2',
    serie: 'VAL',
    descripcion: 'Serie Valencia',
    empresaRif: 'J-87654321-0',
    empresaNombre: 'Sucursal Valencia C.A.',
    activa: true,
  },
  {
    id: '3',
    serie: 'FAC',
    descripcion: 'Serie Facturas Especiales',
    empresaRif: 'J-12345678-9',
    empresaNombre: 'Corporación Principal C.A.',
    activa: true,
  },
  {
    id: '4',
    serie: 'MAR',
    descripcion: 'Serie Maracaibo',
    empresaRif: 'J-11223344-5',
    empresaNombre: 'Filial Maracaibo S.A.',
    activa: false,
  },
];

export function CompanySettingsPage() {
  // FASE 8: Estado extendido para multi-empresa
  const [multiCompanies, setMultiCompanies] = useState<MultiCompanySettings[]>(mockMultiCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(mockMultiCompanies[0].id);
  const [controlBatchesMulti, setControlBatchesMulti] = useState<ControlNumberBatchMulti[]>(mockControlBatchesMulti);
  const [seriesConfig, setSeriesConfig] = useState<SerieConfiguration[]>(mockSeriesConfig);

  // Diálogos
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isSerieDialogOpen, setIsSerieDialogOpen] = useState(false);

  // Estados de edición
  const [editingBatch, setEditingBatch] = useState<ControlNumberBatchMulti | null>(null);
  const [editingCompany, setEditingCompany] = useState<MultiCompanySettings | null>(null);
  const [editingSerie, setEditingSerie] = useState<SerieConfiguration | null>(null);

  // Empresa seleccionada
  const selectedCompany = multiCompanies.find(company => company.id === selectedCompanyId) || multiCompanies[0];

  // FASE 8: Forms extendidos para multi-empresa
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetCompany,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: selectedCompany,
  });

  const {
    register: registerBatch,
    handleSubmit: handleSubmitBatch,
    reset: resetBatch,
    setValue: setValueBatch,
    formState: { errors: batchErrors },
  } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
  });

  const {
    register: registerSerie,
    handleSubmit: handleSubmitSerie,
    reset: resetSerie,
    setValue: setValueSerie,
    formState: { errors: serieErrors },
  } = useForm<SerieForm>({
    resolver: zodResolver(serieSchema),
  });

  // FASE 8: Handlers extendidos para multi-empresa
  const onSubmitCompany = (data: CompanyForm) => {
    if (editingCompany) {
      // Editar empresa existente
      setMultiCompanies(companies =>
        companies.map(company =>
          company.id === editingCompany.id
            ? { ...company, ...data, id: editingCompany.id }
            : company
        )
      );
      setEditingCompany(null);
      toast.success('Empresa actualizada correctamente');
    } else {
      // Nueva empresa
      const newCompany: MultiCompanySettings = {
        ...data,
        id: Date.now().toString(),
      };
      setMultiCompanies(companies => [...companies, newCompany]);
      toast.success('Nueva empresa creada correctamente');
    }
    setIsCompanyDialogOpen(false);
    resetCompany();
  };

  const onSubmitBatch = (data: BatchForm) => {
    if (data.rangeTo <= data.rangeFrom) {
      toast.error('El número final debe ser mayor al número inicial');
      return;
    }

    const empresa = multiCompanies.find(c => c.rif === data.empresaRif);
    if (!empresa) {
      toast.error('Empresa no encontrada');
      return;
    }

    const newBatch: ControlNumberBatchMulti = {
      id: Date.now().toString(),
      rangeFrom: data.rangeFrom,
      rangeTo: data.rangeTo,
      active: true,
      used: 0,
      remaining: data.rangeTo - data.rangeFrom + 1,
      empresaRif: data.empresaRif,
      serie: data.serie,
      empresaNombre: empresa.razonSocial,
    };

    // Desactivar otros lotes de la misma empresa y serie
    const updatedBatches = controlBatchesMulti.map(batch => ({
      ...batch,
      active: batch.empresaRif === data.empresaRif && batch.serie === data.serie ? false : batch.active
    }));

    setControlBatchesMulti([...updatedBatches, newBatch]);
    setIsBatchDialogOpen(false);
    resetBatch();
    toast.success(`Lote de números de control creado para ${empresa.razonSocial} - Serie ${data.serie}`);
  };

  const onSubmitSerie = (data: SerieForm) => {
    const empresa = multiCompanies.find(c => c.rif === data.empresaRif);
    if (!empresa) {
      toast.error('Empresa no encontrada');
      return;
    }

    if (editingSerie) {
      // Editar serie existente
      setSeriesConfig(series =>
        series.map(serie =>
          serie.id === editingSerie.id
            ? { ...serie, ...data, empresaNombre: empresa.razonSocial }
            : serie
        )
      );
      setEditingSerie(null);
      toast.success('Serie actualizada correctamente');
    } else {
      // Nueva serie
      const newSerie: SerieConfiguration = {
        ...data,
        id: Date.now().toString(),
        empresaNombre: empresa.razonSocial,
        activa: true,
      };
      setSeriesConfig(series => [...series, newSerie]);
      toast.success(`Nueva serie ${data.serie} creada para ${empresa.razonSocial}`);
    }
    setIsSerieDialogOpen(false);
    resetSerie();
  };

  // FASE 8: Handlers adicionales para multi-empresa
  const handleDeleteBatch = (id: string) => {
    setControlBatchesMulti(batches => batches.filter(batch => batch.id !== id));
    toast.success('Lote eliminado correctamente');
  };

  const handleActivateBatch = (id: string) => {
    const batchToActivate = controlBatchesMulti.find(batch => batch.id === id);
    if (!batchToActivate) return;

    setControlBatchesMulti(batches =>
      batches.map(batch => ({
        ...batch,
        active: batch.empresaRif === batchToActivate.empresaRif && batch.serie === batchToActivate.serie
          ? batch.id === id
          : batch.active
      }))
    );
    toast.success('Lote activado correctamente');
  };

  const handleDeleteCompany = (id: string) => {
    const company = multiCompanies.find(c => c.id === id);
    if (!company) return;

    setMultiCompanies(companies => companies.filter(company => company.id !== id));
    // También eliminar lotes y series relacionados
    setControlBatchesMulti(batches => batches.filter(batch => batch.empresaRif !== company.rif));
    setSeriesConfig(series => series.filter(serie => serie.empresaRif !== company.rif));

    if (selectedCompanyId === id && multiCompanies.length > 1) {
      const remaining = multiCompanies.filter(c => c.id !== id);
      setSelectedCompanyId(remaining[0].id);
    }

    toast.success(`Empresa ${company.razonSocial} eliminada correctamente`);
  };

  const handleToggleCompanyActive = (id: string) => {
    setMultiCompanies(companies =>
      companies.map(company =>
        company.id === id
          ? { ...company, activa: !company.activa }
          : company
      )
    );
    const company = multiCompanies.find(c => c.id === id);
    toast.success(`Empresa ${company?.razonSocial} ${company?.activa ? 'desactivada' : 'activada'} correctamente`);
  };

  const handleDeleteSerie = (id: string) => {
    const serie = seriesConfig.find(s => s.id === id);
    setSeriesConfig(series => series.filter(serie => serie.id !== id));
    toast.success(`Serie ${serie?.serie} eliminada correctamente`);
  };

  const handleToggleSerieActive = (id: string) => {
    setSeriesConfig(series =>
      series.map(serie =>
        serie.id === id
          ? { ...serie, activa: !serie.activa }
          : serie
      )
    );
    const serie = seriesConfig.find(s => s.id === id);
    toast.success(`Serie ${serie?.serie} ${serie?.activa ? 'desactivada' : 'activada'} correctamente`);
  };

  const handleEditCompany = (company: MultiCompanySettings) => {
    setEditingCompany(company);
    resetCompany(company);
    setIsCompanyDialogOpen(true);
  };

  const handleEditSerie = (serie: SerieConfiguration) => {
    setEditingSerie(serie);
    resetSerie(serie);
    setIsSerieDialogOpen(true);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mock logo upload
      toast.success('Logo subido correctamente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración de Empresa</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona los datos de tu empresa y números de control
          </p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
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

                <Button type="submit" className="w-full md:w-auto">
                  Guardar Configuración
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