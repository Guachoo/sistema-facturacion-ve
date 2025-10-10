import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar as CalendarIcon,
  Download,
  ArrowLeft,
  DollarSign,
  Package,
  Users,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
import { useInvoices } from '@/api/invoices';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthlySales {
  month: string;
  year: number;
  totalVentas: number;
  totalFacturas: number;
  ticketPromedio: number;
  crecimiento: number;
}

interface ProductSales {
  nombre: string;
  cantidad: number;
  total: number;
  participacion: number;
}

export function SalesAnalysisPage() {
  const [period, setPeriod] = useState<string>('6months');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: bcvRate } = useBcvRate();
  const { data: invoices = [] } = useInvoices();

  // Generar datos de ventas por mes
  const generateMonthlySales = (): MonthlySales[] => {
    const months = [];
    const periodsMap = {
      '3months': 3,
      '6months': 6,
      '12months': 12
    };

    const numMonths = periodsMap[period as keyof typeof periodsMap] || 6;

    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.fecha);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });

      const totalVentas = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalFacturas = monthInvoices.length;
      const ticketPromedio = totalFacturas > 0 ? totalVentas / totalFacturas : 0;

      // Calcular crecimiento vs mes anterior
      let crecimiento = 0;
      if (i < numMonths - 1) {
        const prevMonthDate = subMonths(date, 1);
        const prevMonthStart = startOfMonth(prevMonthDate);
        const prevMonthEnd = endOfMonth(prevMonthDate);

        const prevMonthInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.fecha);
          return invoiceDate >= prevMonthStart && invoiceDate <= prevMonthEnd;
        });

        const prevTotalVentas = prevMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);
        if (prevTotalVentas > 0) {
          crecimiento = ((totalVentas - prevTotalVentas) / prevTotalVentas) * 100;
        }
      }

      months.push({
        month: format(date, 'MMM', { locale: es }),
        year: date.getFullYear(),
        totalVentas,
        totalFacturas,
        ticketPromedio,
        crecimiento
      });
    }

    return months;
  };

  // Generar datos de productos más vendidos
  const generateTopProducts = (): ProductSales[] => {
    const productMap = new Map<string, { cantidad: number; total: number }>();

    invoices.forEach(invoice => {
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach(item => {
          const existing = productMap.get(item.descripcion) || { cantidad: 0, total: 0 };
          productMap.set(item.descripcion, {
            cantidad: existing.cantidad + item.cantidad,
            total: existing.total + item.monto
          });
        });
      }
    });

    const totalGeneral = Array.from(productMap.values()).reduce((sum, p) => sum + p.total, 0);

    return Array.from(productMap.entries())
      .map(([nombre, data]) => ({
        nombre,
        cantidad: data.cantidad,
        total: data.total,
        participacion: totalGeneral > 0 ? (data.total / totalGeneral) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const monthlySales = generateMonthlySales();
  const topProducts = generateTopProducts();

  // Estadísticas resumen
  const totalPeriod = monthlySales.reduce((sum, m) => sum + m.totalVentas, 0);
  const totalFacturasPeriod = monthlySales.reduce((sum, m) => sum + m.totalFacturas, 0);
  const promedioMensual = monthlySales.length > 0 ? totalPeriod / monthlySales.length : 0;
  const crecimientoPromedio = monthlySales.length > 1 ?
    monthlySales.slice(1).reduce((sum, m) => sum + m.crecimiento, 0) / (monthlySales.length - 1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/reportes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análisis de Ventas</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tendencias y patrones de facturación por período
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <BcvRateBadge />
        </div>
      </div>

      {/* Resumen del Período */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Total del Período</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{formatVES(totalPeriod)}</div>
                <p className="text-xs text-muted-foreground">
                  {bcvRate && formatUSD(totalPeriod / bcvRate.rate)} USD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Target className="h-4 w-4 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Promedio Mensual</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{formatVES(promedioMensual)}</div>
                <p className="text-xs text-muted-foreground">
                  {totalFacturasPeriod} facturas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                {crecimientoPromedio >= 0 ? (
                  <TrendingUp className="h-4 w-4 sm:h-8 sm:w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 sm:h-8 sm:w-8 text-red-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Crecimiento</div>
                <div className={cn(
                  "text-sm sm:text-xl md:text-2xl font-bold",
                  crecimientoPromedio >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {crecimientoPromedio >= 0 ? '+' : ''}{crecimientoPromedio.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Promedio mensual
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-4 w-4 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Productos Activos</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{topProducts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Con ventas registradas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por Mes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por Mes
          </CardTitle>
          <CardDescription>
            Evolución de las ventas en los últimos {period === '3months' ? '3' : period === '6months' ? '6' : '12'} meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Ventas Totales</TableHead>
                    <TableHead>Facturas</TableHead>
                    <TableHead>Ticket Promedio</TableHead>
                    <TableHead>Crecimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySales.map((month, index) => (
                    <TableRow key={`${month.month}-${month.year}`}>
                      <TableCell className="font-medium">
                        {month.month} {month.year}
                      </TableCell>
                      <TableCell className="font-mono">{formatVES(month.totalVentas)}</TableCell>
                      <TableCell>{month.totalFacturas}</TableCell>
                      <TableCell className="font-mono">{formatVES(month.ticketPromedio)}</TableCell>
                      <TableCell>
                        {index === 0 ? (
                          <Badge variant="outline">Base</Badge>
                        ) : (
                          <Badge
                            variant={month.crecimiento >= 0 ? "default" : "destructive"}
                            className={month.crecimiento >= 0 ? "bg-green-100 text-green-800" : ""}
                          >
                            {month.crecimiento >= 0 ? '+' : ''}{month.crecimiento.toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden grid gap-3">
              {monthlySales.map((month, index) => (
                <Card key={`${month.month}-${month.year}`}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{month.month} {month.year}</h3>
                        {index === 0 ? (
                          <Badge variant="outline">Base</Badge>
                        ) : (
                          <Badge
                            variant={month.crecimiento >= 0 ? "default" : "destructive"}
                            className={month.crecimiento >= 0 ? "bg-green-100 text-green-800" : ""}
                          >
                            {month.crecimiento >= 0 ? '+' : ''}{month.crecimiento.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Ventas</div>
                          <div className="font-mono">{formatVES(month.totalVentas)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Facturas</div>
                          <div>{month.totalFacturas}</div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Ticket Promedio</div>
                        <div className="font-mono">{formatVES(month.ticketPromedio)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productos Más Vendidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Productos Más Vendidos
          </CardTitle>
          <CardDescription>
            Top 10 productos por volumen de ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de productos disponibles
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad Vendida</TableHead>
                        <TableHead>Total Ventas</TableHead>
                        <TableHead>Participación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product.nombre}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <span className="font-medium">{product.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.cantidad}</TableCell>
                          <TableCell className="font-mono">{formatVES(product.total)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(product.participacion, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {product.participacion.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden grid gap-3">
                  {topProducts.map((product, index) => (
                    <Card key={product.nombre}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <span className="font-medium truncate">{product.nombre}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Cantidad</div>
                              <div className="font-medium">{product.cantidad}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Total</div>
                              <div className="font-mono">{formatVES(product.total)}</div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Participación</span>
                              <span className="font-medium">{product.participacion.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(product.participacion, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Gráfico Detallado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SalesAnalysisPage;