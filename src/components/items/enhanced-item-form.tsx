// Enhanced Item Form with Phase 2 integrations
// SENIAT codes, fiscal categories, tax configuration

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Package,
  Percent,
  Calculator,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Info,
  Building2,
  DollarSign
} from 'lucide-react';
import { MoneyInput } from '@/components/ui/money-input';
import {
  useSuggestSeniatCode,
  useValidateFiscalCompliance,
  useCommonSeniatCodes
} from '@/api/items-extended';
import { formatVES } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Item } from '@/types';

// SENIAT categories from Phase 2 implementation
const seniatCategories = {
  gravado: {
    label: 'Gravado',
    description: 'Productos y servicios gravados con IVA',
    alicuotaIvaDefault: 16,
    requiereCodigoArancelario: false
  },
  exento: {
    label: 'Exento de IVA',
    description: 'Productos exentos de IVA según SENIAT',
    alicuotaIvaDefault: 0,
    requiereJustificacion: true
  },
  excluido: {
    label: 'Excluido',
    description: 'Bienes y servicios excluidos del IVA',
    alicuotaIvaDefault: 0,
    requiereJustificacion: true
  },
  no_sujeto: {
    label: 'No Sujeto',
    description: 'Operaciones no sujetas al IVA',
    alicuotaIvaDefault: 0,
    requiereJustificacion: true
  }
} as const;

const unidadesMedida = [
  { codigo: 'UND', descripcion: 'Unidad' },
  { codigo: 'KG', descripcion: 'Kilogramo' },
  { codigo: 'LT', descripcion: 'Litro' },
  { codigo: 'MT', descripcion: 'Metro' },
  { codigo: 'M2', descripcion: 'Metro Cuadrado' },
  { codigo: 'M3', descripcion: 'Metro Cúbico' },
  { codigo: 'HR', descripcion: 'Hora' },
  { codigo: 'DOC', descripcion: 'Documento' },
  { codigo: 'PAQ', descripcion: 'Paquete' },
  { codigo: 'CJ', descripcion: 'Caja' }
];

// Enhanced schema with fiscal fields
const enhancedItemSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  tipo: z.enum(['producto', 'servicio'], { message: 'Tipo es requerido' }),
  precioBase: z.number().min(0.01, 'Precio debe ser mayor a 0'),
  precioUsd: z.number().min(0, 'Precio USD debe ser mayor o igual a 0').optional(),
  costoUnitario: z.number().min(0, 'Costo debe ser mayor o igual a 0').optional(),
  ivaAplica: z.boolean(),

  // Fiscal fields
  clasificacionFiscal: z.enum(['gravado', 'exento', 'excluido', 'no_sujeto']).optional(),
  codigoSeniat: z.string().optional(),
  categoriaSeniat: z.string().optional(),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  origenFiscal: z.enum(['nacional', 'importado', 'zona_libre'], { message: 'Origen fiscal es requerido' }),

  // Tax configuration
  alicuotaIva: z.number().min(0).max(100),
  exentoIva: z.boolean(),
  motivoExencion: z.string().optional(),

  // ISLR (Income tax retention)
  sujetoRetencionIslr: z.boolean(),
  porcentajeRetencionIslr: z.number().min(0).max(100),
  conceptoIslr: z.string().optional(),

  // Inventory (if applicable)
  manejaInventario: z.boolean(),
  stockMinimo: z.number().min(0).optional(),
  stockMaximo: z.number().min(0).optional(),
  ubicacion: z.string().optional(),
  categoria: z.string().optional(),
  activo: z.boolean(),
});

type EnhancedItemForm = z.infer<typeof enhancedItemSchema>;

interface EnhancedItemFormProps {
  item?: Item;
  onSubmit: (data: EnhancedItemForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EnhancedItemForm({
  item,
  onSubmit,
  onCancel,
  isLoading = false
}: EnhancedItemFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  const [showSeniatSuggestions, setShowSeniatSuggestions] = useState(false);
  const [fiscalComplianceResult, setFiscalComplianceResult] = useState<any>(null);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<EnhancedItemForm>({
    resolver: zodResolver(enhancedItemSchema),
    defaultValues: {
      ivaAplica: true,
      clasificacionFiscal: 'gravado',
      unidadMedida: 'UND',
      origenFiscal: 'nacional',
      alicuotaIva: 16,
      exentoIva: false,
      sujetoRetencionIslr: false,
      porcentajeRetencionIslr: 0,
      manejaInventario: true,
      activo: true,
      ...item
    }
  });

  const tipoValue = watch('tipo');
  const descripcionValue = watch('descripcion');
  const clasificacionFiscalValue = watch('clasificacionFiscal');
  const exentoIvaValue = watch('exentoIva');

  // Phase 2 hooks
  const { data: commonSeniatCodes } = useCommonSeniatCodes();
  const seniatSuggestionsMutation = useSuggestSeniatCode();
  const fiscalComplianceMutation = useValidateFiscalCompliance();

  useEffect(() => {
    if (item) {
      Object.entries(item).forEach(([key, value]) => {
        setValue(key as keyof EnhancedItemForm, value);
      });
    }
  }, [item, setValue]);

  // Auto-adjust fiscal settings based on type
  useEffect(() => {
    if (tipoValue === 'servicio') {
      setValue('clasificacionFiscal', 'gravado');
      setValue('manejaInventario', false);
      setValue('sujetoRetencionIslr', true);
      setValue('porcentajeRetencionIslr', 2); // Default ISLR for services
    } else if (tipoValue === 'producto') {
      setValue('clasificacionFiscal', 'gravado');
      setValue('manejaInventario', true);
      setValue('sujetoRetencionIslr', false);
      setValue('porcentajeRetencionIslr', 0);
    }
  }, [tipoValue, setValue]);

  // Auto-suggest SENIAT codes
  useEffect(() => {
    if (descripcionValue && descripcionValue.length > 5) {
      const timeoutId = setTimeout(() => {
        seniatSuggestionsMutation.mutate(descripcionValue, {
          onSuccess: (suggestions) => {
            if (suggestions.suggestions.length > 0) {
              setShowSeniatSuggestions(true);
            }
          }
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [descripcionValue, seniatSuggestionsMutation]);

  // Validate fiscal compliance
  const handleValidateFiscalCompliance = () => {
    const itemData = watch();
    const validationData = {
      itemId: item?.id || 'new-item',
      codigoSeniat: itemData.codigoSeniat,
      clasificacionFiscal: itemData.clasificacionFiscal
    };
    fiscalComplianceMutation.mutate(validationData, {
      onSuccess: (result) => {
        setFiscalComplianceResult(result);
        setShowComplianceDialog(true);
        if (result.isCompliant) {
          toast.success('Cumplimiento fiscal validado', {
            description: 'El item cumple con todas las regulaciones fiscales'
          });
        } else {
          toast.warning('Advertencias de cumplimiento fiscal', {
            description: `Se encontraron ${result.issues.length} problemas`
          });
        }
      },
      onError: (error: any) => {
        toast.error('Error en validación fiscal', {
          description: error.message || 'No se pudo validar el cumplimiento fiscal'
        });
      }
    });
  };

  const applySeniatSuggestion = (suggestion: any) => {
    setValue('codigoSeniat', suggestion.codigo);
    setValue('categoriaSeniat', suggestion.categoria);

    // Map SENIAT category to valid clasificacionFiscal values
    const validClasificaciones = ['gravado', 'exento', 'excluido', 'no_sujeto'];
    const clasificacion = validClasificaciones.includes(suggestion.categoria)
      ? suggestion.categoria
      : 'gravado'; // default to gravado if invalid

    setValue('clasificacionFiscal', clasificacion);
    setShowSeniatSuggestions(false);
    toast.success('Código SENIAT aplicado', {
      description: `Se aplicó el código ${suggestion.codigo}`
    });
  };

  const getSelectedCategory = () => {
    return clasificacionFiscalValue ? seniatCategories[clasificacionFiscalValue as keyof typeof seniatCategories] : null;
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Información Básica
                </CardTitle>
                <CardDescription>
                  Datos principales del producto o servicio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      {...register('codigo')}
                      placeholder="ej. PROD-001"
                    />
                    {errors.codigo && (
                      <p className="text-sm text-destructive">{errors.codigo.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select value={tipoValue} onValueChange={(value: 'producto' | 'servicio') => setValue('tipo', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producto">Producto</SelectItem>
                        <SelectItem value="servicio">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.tipo && (
                      <p className="text-sm text-destructive">{errors.tipo.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <Input
                    id="descripcion"
                    {...register('descripcion')}
                    placeholder="Descripción detallada del producto/servicio"
                  />
                  {errors.descripcion && (
                    <p className="text-sm text-destructive">{errors.descripcion.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría</Label>
                    <Input
                      id="categoria"
                      {...register('categoria')}
                      placeholder="ej. Tecnología, Servicios"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ubicacion">Ubicación</Label>
                    <Input
                      id="ubicacion"
                      {...register('ubicacion')}
                      placeholder="ej. Almacén A-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={watch('activo')}
                    onCheckedChange={(checked) => setValue('activo', checked)}
                  />
                  <Label htmlFor="activo">Item activo</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Configuración Fiscal
                </CardTitle>
                <CardDescription>
                  Códigos SENIAT y configuración de impuestos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clasificacionFiscal">Clasificación Fiscal</Label>
                    <Select
                      value={clasificacionFiscalValue}
                      onValueChange={(value) => setValue('clasificacionFiscal', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar clasificación" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(seniatCategories).map(([key, category]) => (
                          <SelectItem key={key} value={key}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origenFiscal">Origen Fiscal</Label>
                    <Select
                      value={watch('origenFiscal')}
                      onValueChange={(value) => setValue('origenFiscal', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="importado">Importado</SelectItem>
                        <SelectItem value="zona_libre">Zona Libre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {getSelectedCategory() && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>{getSelectedCategory()!.label}</AlertTitle>
                    <AlertDescription>
                      {getSelectedCategory()!.description}
                      <br />
                      <span className="text-sm font-medium">
                        Alícuota IVA por defecto: {getSelectedCategory()!.alicuotaIvaDefault}%
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigoSeniat">Código SENIAT</Label>
                    <div className="flex gap-2">
                      <Input
                        id="codigoSeniat"
                        {...register('codigoSeniat')}
                        placeholder="ej. 84710000"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSeniatSuggestions(true)}
                        disabled={seniatSuggestionsMutation.isPending}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                    <Select
                      value={watch('unidadMedida')}
                      onValueChange={(value) => setValue('unidadMedida', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesMedida.map((unidad) => (
                          <SelectItem key={unidad.codigo} value={unidad.codigo}>
                            {unidad.codigo} - {unidad.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SENIAT Suggestions Dialog */}
                {showSeniatSuggestions && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Códigos SENIAT Sugeridos</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSeniatSuggestions(false)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {commonSeniatCodes?.slice(0, 5).map((code: any) => (
                        <div
                          key={code.codigo}
                          className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                          onClick={() => applySeniatSuggestion(code)}
                        >
                          <div>
                            <p className="font-medium">{code.codigo}</p>
                            <p className="text-sm text-gray-600">{code.descripcion}</p>
                          </div>
                          <Badge variant="outline">{code.categoria}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IVA Configuration */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Configuración IVA
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ivaAplica"
                        checked={watch('ivaAplica')}
                        onCheckedChange={(checked) => setValue('ivaAplica', checked)}
                      />
                      <Label htmlFor="ivaAplica">Aplica IVA</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="exentoIva"
                        checked={exentoIvaValue}
                        onCheckedChange={(checked) => setValue('exentoIva', checked)}
                      />
                      <Label htmlFor="exentoIva">Exento de IVA</Label>
                    </div>

                    {!exentoIvaValue && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="alicuotaIva">Alícuota IVA (%)</Label>
                          <Input
                            id="alicuotaIva"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...register('alicuotaIva', { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    )}

                    {exentoIvaValue && (
                      <div className="space-y-2">
                        <Label htmlFor="motivoExencion">Motivo de Exención</Label>
                        <Input
                          id="motivoExencion"
                          {...register('motivoExencion')}
                          placeholder="Justificación legal de la exención"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ISLR Configuration */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Retención ISLR
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sujetoRetencionIslr"
                        checked={watch('sujetoRetencionIslr')}
                        onCheckedChange={(checked) => setValue('sujetoRetencionIslr', checked)}
                      />
                      <Label htmlFor="sujetoRetencionIslr">Sujeto a retención ISLR</Label>
                    </div>

                    {watch('sujetoRetencionIslr') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="porcentajeRetencionIslr">Porcentaje Retención (%)</Label>
                          <Input
                            id="porcentajeRetencionIslr"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...register('porcentajeRetencionIslr', { valueAsNumber: true })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="conceptoIslr">Concepto ISLR</Label>
                          <Input
                            id="conceptoIslr"
                            {...register('conceptoIslr')}
                            placeholder="Código concepto SENIAT"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fiscal Compliance Validation */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Validación de Cumplimiento</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleValidateFiscalCompliance}
                      disabled={fiscalComplianceMutation.isPending}
                    >
                      {fiscalComplianceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Validar
                    </Button>
                  </div>

                  {fiscalComplianceResult && (
                    <Alert className="mt-3">
                      {fiscalComplianceResult.isCompliant ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {fiscalComplianceResult.isCompliant ? 'Cumplimiento Verificado' : 'Advertencias de Cumplimiento'}
                      </AlertTitle>
                      <AlertDescription>
                        {fiscalComplianceResult.isCompliant ? (
                          'El item cumple con todas las regulaciones fiscales venezolanas.'
                        ) : (
                          <ul className="list-disc list-inside mt-2">
                            {fiscalComplianceResult.issues?.map((issue: string, index: number) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Configuración de Precios
                </CardTitle>
                <CardDescription>
                  Precios en bolívares y dólares, costos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precioBase">Precio Base (VES) *</Label>
                    <MoneyInput
                      id="precioBase"
                      value={watch('precioBase')}
                      onChange={(value) => setValue('precioBase', value)}
                      currency="VES"
                    />
                    {errors.precioBase && (
                      <p className="text-sm text-destructive">{errors.precioBase.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precioUsd">Precio USD</Label>
                    <MoneyInput
                      id="precioUsd"
                      value={watch('precioUsd') || 0}
                      onChange={(value) => setValue('precioUsd', value)}
                      currency="USD"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costoUnitario">Costo Unitario (VES)</Label>
                  <MoneyInput
                    id="costoUnitario"
                    value={watch('costoUnitario') || 0}
                    onChange={(value) => setValue('costoUnitario', value)}
                    currency="VES"
                  />
                </div>

                {/* Price calculations preview */}
                {watch('precioBase') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Vista Previa de Cálculos</AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                          <span className="font-medium">Precio Base:</span> {formatVES(watch('precioBase'))}
                        </div>
                        {watch('ivaAplica') && !watch('exentoIva') && (
                          <div>
                            <span className="font-medium">IVA ({watch('alicuotaIva')}%):</span> {formatVES((watch('precioBase') * watch('alicuotaIva')) / 100)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Precio Final:</span> {formatVES(
                            watch('precioBase') + (watch('ivaAplica') && !watch('exentoIva') ? (watch('precioBase') * watch('alicuotaIva')) / 100 : 0)
                          )}
                        </div>
                        {watch('costoUnitario') && (
                          <div>
                            <span className="font-medium">Margen:</span> {(
                              ((watch('precioBase') - (watch('costoUnitario') || 0)) / watch('precioBase')) * 100
                            ).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Control de Inventario
                </CardTitle>
                <CardDescription>
                  Configuración de stock y control de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="manejaInventario"
                    checked={watch('manejaInventario')}
                    onCheckedChange={(checked) => setValue('manejaInventario', checked)}
                  />
                  <Label htmlFor="manejaInventario">Maneja inventario físico</Label>
                </div>

                {watch('manejaInventario') && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                        <Input
                          id="stockMinimo"
                          type="number"
                          min="0"
                          {...register('stockMinimo', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stockMaximo">Stock Máximo</Label>
                        <Input
                          id="stockMaximo"
                          type="number"
                          min="0"
                          {...register('stockMaximo', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Control de Inventario Activo</AlertTitle>
                      <AlertDescription>
                        Este item tendrá seguimiento de inventario. Se generarán alertas cuando el stock esté por debajo del mínimo configurado.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {!watch('manejaInventario') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sin Control de Inventario</AlertTitle>
                    <AlertDescription>
                      Este item no tendrá seguimiento de stock. Ideal para servicios o productos virtuales.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setFiscalComplianceResult(null);
                setShowSeniatSuggestions(false);
                setCurrentTab('basic');
              }}
              disabled={isLoading}
            >
              Limpiar Formulario
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Actualizar' : 'Crear'} Item
            </Button>
          </DialogFooter>
        </form>
      </Tabs>

      {/* Dialog para mostrar resultados de cumplimiento fiscal */}
      <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {fiscalComplianceResult?.isCompliant ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Resultado de Validación Fiscal
            </DialogTitle>
            <DialogDescription>
              {fiscalComplianceResult?.isCompliant
                ? 'El item cumple con todas las regulaciones fiscales.'
                : 'Se encontraron problemas que requieren atención.'}
            </DialogDescription>
          </DialogHeader>

          {fiscalComplianceResult && (
            <div className="space-y-4">
              {!fiscalComplianceResult.isCompliant && fiscalComplianceResult.issues?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Problemas encontrados:</h4>
                  <ul className="space-y-1">
                    {fiscalComplianceResult.issues.map((issue: string, index: number) => (
                      <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {fiscalComplianceResult.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recomendaciones:</h4>
                  <ul className="space-y-1">
                    {fiscalComplianceResult.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplianceDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}