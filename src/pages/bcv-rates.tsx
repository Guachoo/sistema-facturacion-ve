// BCV Rates Management Page
// Advanced rate management with sealing, analytics, and monitoring

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Download,
  Bell,
  BarChart3,
  Eye,
  Clock
} from 'lucide-react';
import {
  useBcvRate,
  useHistoricalBcvRates,
  useSealBcvRate,
  useBcvRateAnalytics,
  useRateChangeMonitor,
  useBcvRateHistory,
  useRateAnalytics
} from '@/api/rates';
import { formatNumber, formatDateVE } from '@/lib/formatters';
import { toast } from 'sonner';

const sealRateSchema = z.object({
  fecha: z.string().min(1, 'Fecha es requerida'),
  motivo: z.string().min(1, 'Motivo es requerido'),
  documentoId: z.string().optional(),
});

type SealRateForm = z.infer<typeof sealRateSchema>;

export function BcvRatesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sealDialogOpen, setSealDialogOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  const { data: currentRate, isLoading: currentLoading, refetch: refetchCurrent } = useBcvRate();
  const { data: historicalRates, isLoading: historicalLoading } = useHistoricalBcvRates({
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const { data: analytics } = useBcvRateAnalytics(analyticsRange);
  const { data: rateMonitor } = useRateChangeMonitor();

  // New hooks for rate history
  const { data: rateHistory, isLoading: historyLoading } = useBcvRateHistory(30);
  const { data: rateAnalytics, isLoading: analyticsLoading } = useRateAnalytics();

  const sealRateMutation = useSealBcvRate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SealRateForm>({
    resolver: zodResolver(sealRateSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0]
    }
  });

  const handleSealRate = (data: SealRateForm) => {
    sealRateMutation.mutate({
      fecha: data.fecha,
      motivo: data.motivo,
      documentoId: data.documentoId
    }, {
      onSuccess: () => {
        toast.success('Tasa BCV sellada correctamente', {
          description: 'La tasa ha sido sellada para uso fiscal'
        });
        setSealDialogOpen(false);
        reset();
        refetchCurrent();
      },
      onError: (error: any) => {
        toast.error('Error al sellar la tasa', {
          description: error.message || 'No se pudo sellar la tasa BCV'
        });
      }
    });
  };

  const getRateVariation = (current: number, previous: number) => {
    const variation = ((current - previous) / previous) * 100;
    const isPositive = variation > 0;

    return {
      percentage: Math.abs(variation).toFixed(2),
      isPositive,
      icon: isPositive ? TrendingUp : TrendingDown,
      className: isPositive ? 'text-red-600' : 'text-green-600'
    };
  };

  const getVolatilityBadge = (volatility: number) => {
    if (volatility < 1) return { label: 'Baja', variant: 'secondary' as const, color: 'bg-green-100 text-green-800' };
    if (volatility < 3) return { label: 'Media', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Alta', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión Tasas BCV</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Administración avanzada de tasas de cambio con sellado fiscal y monitoreo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchCurrent()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Dialog open={sealDialogOpen} onOpenChange={setSealDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Shield className="mr-2 h-4 w-4" />
                Sellar Tasa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sellar Tasa BCV</DialogTitle>
                <DialogDescription>
                  Selle una tasa BCV para uso en documentos fiscales
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleSealRate)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha de la Tasa</Label>
                  <Input
                    id="fecha"
                    type="date"
                    {...register('fecha')}
                  />
                  {errors.fecha && (
                    <p className="text-sm text-destructive">{errors.fecha.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo del Sellado</Label>
                  <Select onValueChange={(value) => register('motivo').onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emision_factura">Emisión de Factura</SelectItem>
                      <SelectItem value="nota_credito">Nota de Crédito</SelectItem>
                      <SelectItem value="nota_debito">Nota de Débito</SelectItem>
                      <SelectItem value="cierre_periodo">Cierre de Período</SelectItem>
                      <SelectItem value="auditoria">Auditoría</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.motivo && (
                    <p className="text-sm text-destructive">{errors.motivo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentoId">ID Documento (Opcional)</Label>
                  <Input
                    id="documentoId"
                    {...register('documentoId')}
                    placeholder="ID del documento fiscal relacionado"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSealDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={sealRateMutation.isPending}>
                    {sealRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sellar Tasa
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Tasa Actual</TabsTrigger>
          <TabsTrigger value="historical">Historial Original</TabsTrigger>
          <TabsTrigger value="history">📊 Historial BCV</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoreo</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Current Rate Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Actual</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {currentLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </div>
                ) : currentRate ? (
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(currentRate.rate)} VES</div>
                    <p className="text-xs text-muted-foreground">
                      por 1 USD - {formatDateVE(new Date(currentRate.date))}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={currentRate.source === 'BCV_OFFICIAL' ? 'secondary' : 'outline'}>
                        {currentRate.source}
                      </Badge>
                      {currentRate.sealed && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Sellada
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No disponible</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variación Diaria</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analytics?.dailyVariation ? (
                  <div>
                    <div className={`text-2xl font-bold ${analytics.dailyVariation.isPositive ? 'text-red-600' : 'text-green-600'}`}>
                      {analytics.dailyVariation.isPositive ? '+' : ''}{analytics.dailyVariation.percentage}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      vs. día anterior
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {analytics.dailyVariation.isPositive ? (
                        <TrendingUp className="h-4 w-4 text-red-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {analytics.dailyVariation.isPositive ? 'Devaluación' : 'Revaluación'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Calculando...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volatilidad</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analytics?.volatility ? (
                  <div>
                    <div className="text-2xl font-bold">{analytics.volatility.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">
                      Últimos {analyticsRange === '7d' ? '7 días' : analyticsRange === '30d' ? '30 días' : '90 días'}
                    </p>
                    <div className="mt-2">
                      <Badge variant={getVolatilityBadge(analytics.volatility).variant} className={getVolatilityBadge(analytics.volatility).color}>
                        {getVolatilityBadge(analytics.volatility).label}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Calculando...</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rate Status */}
          {currentRate && (
            <Card>
              <CardHeader>
                <CardTitle>Estado de la Tasa</CardTitle>
                <CardDescription>
                  Información detallada sobre la tasa actual del BCV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fuente:</span>
                      <Badge variant="outline">{currentRate.source}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Validada:</span>
                      {currentRate.validated ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sellada:</span>
                      {currentRate.sealed ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Última actualización:</span>
                      <span className="text-sm font-mono">
                        {currentRate.lastUpdate ?
                          new Date(currentRate.lastUpdate).toLocaleString('es-VE') :
                          'No disponible'
                        }
                      </span>
                    </div>
                    {currentRate.sealed && currentRate.sealedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fecha de sellado:</span>
                        <span className="text-sm font-mono">
                          {new Date(currentRate.sealedAt).toLocaleString('es-VE')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {currentRate.observations && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Observaciones</AlertTitle>
                    <AlertDescription>{currentRate.observations}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Tasas BCV</CardTitle>
              <CardDescription>
                Últimas tasas de cambio registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando historial...</span>
                </div>
              ) : historicalRates && historicalRates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tasa (VES/USD)</TableHead>
                      <TableHead>Variación</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalRates.map((rate: any, index: number) => {
                      const previousRate = historicalRates[index + 1];
                      const variation = previousRate ? getRateVariation(rate.rate, previousRate.rate) : null;

                      return (
                        <TableRow key={rate.id || `rate-${index}`}>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {rate.date ? formatDateVE(new Date(rate.date)) : 'Fecha inválida'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">
                              {formatNumber(rate.rate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {variation ? (
                              <div className={`flex items-center gap-1 ${variation.className}`}>
                                <variation.icon className="h-4 w-4" />
                                <span>{variation.percentage}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rate.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {rate.validated && (
                                <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Validada
                                </Badge>
                              )}
                              {rate.sealed && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Sellada
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos históricos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Análisis de Tendencias
                <Select value={analyticsRange} onValueChange={(value: '7d' | '30d' | '90d') => setAnalyticsRange(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="30d">30 días</SelectItem>
                    <SelectItem value="90d">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
              <CardDescription>
                Análisis estadístico de las tasas de cambio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Tasa Promedio</h4>
                    <div className="text-2xl font-bold">
                      {formatNumber(analytics.averageRate)} VES
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Promedio del período
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Tasa Máxima</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {formatNumber(analytics.maxRate)} VES
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {analytics.maxRateDate ? formatDateVE(new Date(analytics.maxRateDate)) : 'No disponible'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Tasa Mínima</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(analytics.minRate)} VES
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {analytics.minRateDate ? formatDateVE(new Date(analytics.minRateDate)) : 'No disponible'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando análisis...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Monitoreo de Cambios
              </CardTitle>
              <CardDescription>
                Configure alertas automáticas para cambios significativos en las tasas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Monitoreo Activo</div>
                  <p className="text-sm text-muted-foreground">
                    Recibir alertas cuando la tasa cambie más del umbral configurado
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={monitoringEnabled}
                  onChange={(e) => setMonitoringEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              {rateMonitor && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Estado del Monitoreo</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <div>Umbral configurado: {rateMonitor.threshold}%</div>
                      <div>Última verificación: {new Date(rateMonitor.lastCheck).toLocaleString('es-VE')}</div>
                      {rateMonitor.alertsCount > 0 && (
                        <div>Alertas generadas hoy: {rateMonitor.alertsCount}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nueva pestaña de Historial */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Historial de Tasas BCV
              </CardTitle>
              <CardDescription>
                Últimas tasas de cambio registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Analytics Summary */}
              {rateAnalytics && !analyticsLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{rateAnalytics.currentRate} Bs</div>
                    <div className="text-xs text-muted-foreground">Tasa Actual</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{rateAnalytics.weeklyAverage} Bs</div>
                    <div className="text-xs text-muted-foreground">Promedio Semanal</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className={`text-lg font-semibold ${rateAnalytics.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rateAnalytics.weeklyChange >= 0 ? '+' : ''}{rateAnalytics.weeklyChange}%
                    </div>
                    <div className="text-xs text-muted-foreground">Cambio Semanal</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{rateAnalytics.volatility}</div>
                    <div className="text-xs text-muted-foreground">Volatilidad</div>
                  </div>
                </div>
              )}

              {/* Historical Rates Table */}
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Cargando historial...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Día</TableHead>
                        <TableHead className="text-right">Tasa (Bs/USD)</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead className="text-right">Variación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateHistory && rateHistory.length > 0 ? (
                        rateHistory.map((entry, index) => {
                          const previousRate = rateHistory[index + 1]?.rate;
                          const variation = previousRate ? entry.rate - previousRate : 0;
                          const variationPercent = previousRate ? ((entry.rate - previousRate) / previousRate) * 100 : 0;

                          return (
                            <TableRow key={entry.date}>
                              <TableCell className="font-mono text-sm">
                                {entry.date}
                              </TableCell>
                              <TableCell className="text-sm capitalize">
                                {entry.weekday}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {entry.rate.toFixed(2)} Bs
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {entry.source}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {index < rateHistory.length - 1 && (
                                  <div className={`text-sm font-medium ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {variation >= 0 ? '+' : ''}{variation.toFixed(2)} Bs
                                    <div className="text-xs text-muted-foreground">
                                      ({variation >= 0 ? '+' : ''}{variationPercent.toFixed(2)}%)
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay datos de historial disponibles
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Export Button */}
                  {rateHistory && rateHistory.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          try {
                            const { RateHistoryManager } = require('@/lib/rate-history');
                            const csv = RateHistoryManager.exportToCsv();
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `historial_tasas_bcv_${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Historial exportado exitosamente');
                          } catch (error) {
                            toast.error('Error al exportar historial');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}