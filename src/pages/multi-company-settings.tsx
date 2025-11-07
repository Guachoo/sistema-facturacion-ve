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
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building,
  Upload,
  Plus,
  Edit,
  Trash2,
  FileText,
  Globe,
  Settings2,
  CheckCircle2,
  Building2,
  MapPin,
  Users
} from 'lucide-react';
import { RifInput } from '@/components/ui/rif-input';
import { validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';

// FASE 8: Esquemas para Multi-empresa
const companySchema = z.object({
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  domicilioFiscal: z.string().min(1, 'Domicilio fiscal es requerido'),
  telefonos: z.string().min(1, 'Teléfonos son requeridos'),
  email: z.string().email('Email inválido'),
  condicionesVenta: z.string().min(1, 'Condiciones de venta son requeridas'),
  tipo: z.enum(['principal', 'sucursal']).default('principal'),
  empresaPadreRif: z.string().optional(),
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

// Tipos para Multi-empresa
interface MultiCompanySettings {
  id: string;
  razonSocial: string;
  rif: string;
  domicilioFiscal: string;
  telefonos: string;
  email: string;
  condicionesVenta: string;
  tipo: 'principal' | 'sucursal';
  empresaPadreRif?: string;
  activa: boolean;
}

interface ControlNumberBatchMulti {
  id: string;
  rangeFrom: number;
  rangeTo: number;
  active: boolean;
  used: number;
  remaining: number;
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

// Mock data para multi-empresa
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
    activa: false,
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
    active: true,
    used: 45,
    remaining: 255,
    empresaRif: 'J-87654321-0',
    serie: 'VAL',
    empresaNombre: 'Sucursal Valencia C.A.',
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
];

export function MultiCompanySettingsPage() {
  // Estado para multi-empresa
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

  // Forms
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

  // Handlers
  const onSubmitCompany = (data: CompanyForm) => {
    if (editingCompany) {
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

    const updatedBatches = controlBatchesMulti.map(batch => ({
      ...batch,
      active: batch.empresaRif === data.empresaRif && batch.serie === data.serie ? false : batch.active
    }));

    setControlBatchesMulti([...updatedBatches, newBatch]);
    setIsBatchDialogOpen(false);
    resetBatch();
    toast.success(`Lote creado para ${empresa.razonSocial} - Serie ${data.serie}`);
  };

  const onSubmitSerie = (data: SerieForm) => {
    const empresa = multiCompanies.find(c => c.rif === data.empresaRif);
    if (!empresa) {
      toast.error('Empresa no encontrada');
      return;
    }

    if (editingSerie) {
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

  const handleEditCompany = (company: MultiCompanySettings) => {
    setEditingCompany(company);
    resetCompany(company);
    setIsCompanyDialogOpen(true);
  };

  const handleDeleteCompany = (id: string) => {
    const company = multiCompanies.find(c => c.id === id);
    if (!company) return;

    setMultiCompanies(companies => companies.filter(company => company.id !== id));
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
    toast.success(`Empresa ${company?.razonSocial} ${company?.activa ? 'desactivada' : 'activada'}`);
  };

  const activeSeries = seriesConfig.filter(serie => serie.activa);
  const activeCompanies = multiCompanies.filter(company => company.activa);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración Multi-empresa</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona múltiples empresas, RIFs y configuraciones fiscales
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
                </DialogTitle>
                <DialogDescription>
                  {editingCompany ? 'Modifica los datos de la empresa' : 'Crea una nueva empresa o sucursal'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitCompany)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    rows={2}
                  />
                  {errors.domicilioFiscal && (
                    <p className="text-sm text-destructive">{errors.domicilioFiscal.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefonos">Teléfonos *</Label>
                    <Input
                      id="telefonos"
                      {...register('telefonos')}
                      placeholder="+58-212-1234567"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Empresa *</Label>
                    <Select value={watch('tipo')} onValueChange={(value: 'principal' | 'sucursal') => setValue('tipo', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principal">Empresa Principal</SelectItem>
                        <SelectItem value="sucursal">Sucursal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watch('tipo') === 'sucursal' && (
                    <div className="space-y-2">
                      <Label htmlFor="empresaPadreRif">Empresa Padre</Label>
                      <Select value={watch('empresaPadreRif')} onValueChange={(value) => setValue('empresaPadreRif', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empresa padre" />
                        </SelectTrigger>
                        <SelectContent>
                          {multiCompanies
                            .filter(c => c.tipo === 'principal')
                            .map(company => (
                              <SelectItem key={company.id} value={company.rif}>
                                {company.razonSocial}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicionesVenta">Condiciones de Venta *</Label>
                  <Textarea
                    id="condicionesVenta"
                    {...register('condicionesVenta')}
                    rows={2}
                    placeholder="Ej: Pago de contado. Precios incluyen IVA."
                  />
                  {errors.condicionesVenta && (
                    <p className="text-sm text-destructive">{errors.condicionesVenta.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCompany ? 'Actualizar' : 'Crear'} Empresa
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="control-numbers">Números Control</TabsTrigger>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
        </TabsList>

        {/* Tab de Empresas */}
        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Empresas Registradas
              </CardTitle>
              <CardDescription>
                Gestiona múltiples empresas y sucursales con diferentes RIFs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>RIF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {company.tipo === 'principal' ? (
                            <Building2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <MapPin className="h-4 w-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium">{company.razonSocial}</div>
                            <div className="text-xs text-muted-foreground">{company.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{company.rif}</TableCell>
                      <TableCell>
                        <Badge variant={company.tipo === 'principal' ? 'default' : 'secondary'}>
                          {company.tipo === 'principal' ? 'Principal' : 'Sucursal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={company.activa}
                            onCheckedChange={() => handleToggleCompanyActive(company.id)}
                          />
                          <span className="text-xs">
                            {company.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {seriesConfig.filter(s => s.empresaRif === company.rif && s.activa).length} series
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCompany(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCompany(company.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Series */}
        <TabsContent value="series" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Configuración de Series
                  </CardTitle>
                  <CardDescription>
                    Gestiona las series de facturación por empresa
                  </CardDescription>
                </div>
                <Dialog open={isSerieDialogOpen} onOpenChange={setIsSerieDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Serie
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Serie</DialogTitle>
                      <DialogDescription>
                        Crea una nueva serie para una empresa
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitSerie(onSubmitSerie)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="serie">Serie *</Label>
                          <Input
                            id="serie"
                            {...registerSerie('serie')}
                            placeholder="A, B, FAC..."
                          />
                          {serieErrors.serie && (
                            <p className="text-sm text-destructive">{serieErrors.serie.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="empresaRif">Empresa *</Label>
                          <Select onValueChange={(value) => setValueSerie('empresaRif', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar empresa" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCompanies.map(company => (
                                <SelectItem key={company.id} value={company.rif}>
                                  {company.razonSocial}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {serieErrors.empresaRif && (
                            <p className="text-sm text-destructive">{serieErrors.empresaRif.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción *</Label>
                        <Input
                          id="descripcion"
                          {...registerSerie('descripcion')}
                          placeholder="Serie principal de facturas"
                        />
                        {serieErrors.descripcion && (
                          <p className="text-sm text-destructive">{serieErrors.descripcion.message}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSerieDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Crear Serie
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
                    <TableHead>Serie</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Lotes</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seriesConfig.map((serie) => (
                    <TableRow key={serie.id}>
                      <TableCell className="font-mono font-bold">{serie.serie}</TableCell>
                      <TableCell>{serie.descripcion}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{serie.empresaNombre}</div>
                          <div className="text-muted-foreground">{serie.empresaRif}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={serie.activa ? 'default' : 'secondary'}>
                          {serie.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {controlBatchesMulti.filter(b => b.empresaRif === serie.empresaRif && b.serie === serie.serie).length} lotes
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSerie(serie);
                              resetSerie(serie);
                              setIsSerieDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSeriesConfig(series => series.filter(s => s.id !== serie.id));
                              toast.success(`Serie ${serie.serie} eliminada`);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Números de Control */}
        <TabsContent value="control-numbers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Números de Control Multi-empresa
                  </CardTitle>
                  <CardDescription>
                    Gestiona lotes de números de control por empresa y serie
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
                        Define el rango de números de control para una empresa y serie
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitBatch(onSubmitBatch)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="empresaRif">Empresa *</Label>
                          <Select onValueChange={(value) => setValueBatch('empresaRif', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar empresa" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCompanies.map(company => (
                                <SelectItem key={company.id} value={company.rif}>
                                  {company.razonSocial}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {batchErrors.empresaRif && (
                            <p className="text-sm text-destructive">{batchErrors.empresaRif.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serie">Serie *</Label>
                          <Select onValueChange={(value) => setValueBatch('serie', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar serie" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeSeries.map(serie => (
                                <SelectItem key={serie.id} value={serie.serie}>
                                  {serie.serie} - {serie.empresaNombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {batchErrors.serie && (
                            <p className="text-sm text-destructive">{batchErrors.serie.message}</p>
                          )}
                        </div>
                      </div>
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
                    <TableHead>Empresa</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controlBatchesMulti.map((batch) => {
                    const total = batch.rangeTo - batch.rangeFrom + 1;
                    const usagePercentage = (batch.used / total) * 100;

                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{batch.empresaNombre}</div>
                            <div className="text-muted-foreground">{batch.empresaRif}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold">{batch.serie}</TableCell>
                        <TableCell className="font-mono">
                          {batch.rangeFrom.toLocaleString()} - {batch.rangeTo.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.active ? 'default' : 'secondary'}>
                            {batch.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{batch.used.toLocaleString()} usados</span>
                              <span>{batch.remaining.toLocaleString()} restantes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                            <div className="text-center text-xs text-muted-foreground">
                              {usagePercentage.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!batch.active && batch.remaining > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setControlBatchesMulti(batches =>
                                    batches.map(b => ({
                                      ...b,
                                      active: b.empresaRif === batch.empresaRif && b.serie === batch.serie
                                        ? b.id === batch.id
                                        : b.active
                                    }))
                                  );
                                  toast.success('Lote activado correctamente');
                                }}
                              >
                                Activar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setControlBatchesMulti(batches => batches.filter(b => b.id !== batch.id));
                                toast.success('Lote eliminado correctamente');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{multiCompanies.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCompanies.length} activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Series Configuradas</CardTitle>
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seriesConfig.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSeries.length} activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes de Control</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{controlBatchesMulti.length}</div>
                <p className="text-xs text-muted-foreground">
                  {controlBatchesMulti.filter(b => b.active).length} activos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Información por Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Resumen por Empresa
              </CardTitle>
              <CardDescription>
                Estado detallado de cada empresa del grupo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {multiCompanies.map((company) => {
                  const companySeries = seriesConfig.filter(s => s.empresaRif === company.rif);
                  const companyBatches = controlBatchesMulti.filter(b => b.empresaRif === company.rif);
                  const activeBatches = companyBatches.filter(b => b.active);

                  return (
                    <div key={company.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {company.tipo === 'principal' ? (
                            <Building2 className="h-6 w-6 text-blue-600" />
                          ) : (
                            <MapPin className="h-6 w-6 text-green-600" />
                          )}
                          <div>
                            <h3 className="font-semibold">{company.razonSocial}</h3>
                            <p className="text-sm text-muted-foreground">{company.rif}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={company.tipo === 'principal' ? 'default' : 'secondary'}>
                            {company.tipo === 'principal' ? 'Principal' : 'Sucursal'}
                          </Badge>
                          <Badge variant={company.activa ? 'default' : 'destructive'}>
                            {company.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-3 border rounded">
                          <div className="text-lg font-bold">{companySeries.length}</div>
                          <div className="text-xs text-muted-foreground">Series</div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <div className="text-lg font-bold">{companyBatches.length}</div>
                          <div className="text-xs text-muted-foreground">Lotes</div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <div className="text-lg font-bold">{activeBatches.length}</div>
                          <div className="text-xs text-muted-foreground">Activos</div>
                        </div>
                      </div>

                      {companySeries.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Series configuradas:</div>
                          <div className="flex flex-wrap gap-1">
                            {companySeries.map(serie => (
                              <Badge key={serie.id} variant="outline" className="text-xs">
                                {serie.serie}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}