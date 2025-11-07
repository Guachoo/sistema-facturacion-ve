import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calculator,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
  DollarSign,
  Receipt,
  Users,
  ArrowRight,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Filter,
  Search,
  Shield,
  Target
} from 'lucide-react';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
import type { BcvRate } from '@/types';
import { useInvoices } from '@/api/invoices';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const reportCards = [
  {
    title: 'Libro de Ventas',
    description: 'Registro detallado de todas las facturas emitidas',
    icon: FileText,
    href: '/reportes/libro-ventas',
    color: 'bg-blue-500',
    stats: 'Últimos 30 días',
    disabled: false
  },
  {
    title: 'Reporte IGTF',
    description: 'Impuesto a las Grandes Transacciones Financieras',
    icon: Calculator,
    href: '/reportes/igtf',
    color: 'bg-orange-500',
    stats: 'Transacciones en USD',
    disabled: false
  },
  {
    title: 'IVA Mensual',
    description: 'Declaración mensual de IVA para SENIAT',
    icon: Receipt,
    href: '/reportes/iva-mensual',
    color: 'bg-emerald-500',
    stats: 'Base imponible y cálculos',
    disabled: false
  },
  {
    title: 'Análisis Fiscal',
    description: 'Reporte integral de cumplimiento fiscal venezolano',
    icon: Shield,
    href: '/reportes/analisis-fiscal',
    color: 'bg-indigo-500',
    stats: 'Cumplimiento SENIAT',
    disabled: false
  },
  {
    title: 'Análisis de Ventas',
    description: 'Tendencias y patrones de facturación por período',
    icon: TrendingUp,
    href: '/reportes/analisis-ventas',
    color: 'bg-green-500',
    stats: 'Comparativo mensual',
    disabled: false
  },
  {
    title: 'Reporte de Clientes',
    description: 'Análisis de cartera y comportamiento de clientes',
    icon: Users,
    href: '/reportes/analisis-clientes',
    color: 'bg-purple-500',
    stats: 'Top 10 clientes',
    disabled: false
  }
];

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [reportType, setReportType] = useState<string>('ventas');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const bcvRateQuery = useBcvRate();
  const bcvRate = bcvRateQuery.data as BcvRate | undefined;
  const { data: invoices = [] } = useInvoices();

  // Filter invoices for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.fecha);
    return invoiceDate.getMonth() === currentMonth &&
           invoiceDate.getFullYear() === currentYear;
  });

  // Calculate summary statistics
  const totalFacturas = monthlyInvoices.length;
  const totalVentasVES = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalVentasUSD = bcvRate?.rate ? totalVentasVES / bcvRate.rate : 0;
  const totalIGTF = monthlyInvoices.reduce((sum, inv) => sum + inv.montoIgtf, 0);
  const promedioFactura = totalFacturas > 0 ? totalVentasVES / totalFacturas : 0;

  // Recent invoices for quick preview with search filtering
  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.numero?.toLowerCase().includes(searchLower) ||
      invoice.receptor?.nombre?.toLowerCase().includes(searchLower) ||
      invoice.receptor?.razonSocial?.toLowerCase().includes(searchLower) ||
      invoice.receptor?.rif?.toLowerCase().includes(searchLower)
    );
  });

  const recentInvoices = filteredInvoices.slice(0, 10);

  // Calculate monthly sales data for chart visualization
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.getMonth(),
      year: date.getFullYear(),
      name: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    };
  }).reverse();

  const monthlySalesData = last6Months.map(period => {
    const monthInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.fecha);
      return invoiceDate.getMonth() === period.month &&
             invoiceDate.getFullYear() === period.year;
    });

    const monthTotal = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const monthCount = monthInvoices.length;

    return {
      name: period.name,
      ventas: Math.round(monthTotal),
      facturas: monthCount,
      promedio: monthCount > 0 ? Math.round(monthTotal / monthCount) : 0
    };
  });

  // Calculate sales distribution by invoice state for pie chart
  const salesByState = invoices.reduce((acc, invoice) => {
    const state = invoice.estado || 'emitida';
    if (!acc[state]) {
      acc[state] = { total: 0, count: 0 };
    }
    acc[state].total += invoice.total;
    acc[state].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const salesDistributionData = Object.entries(salesByState).map(([state, data]) => {
    const percentage = totalVentasVES > 0 ? (data.total / totalVentasVES) * 100 : 0;
    return {
      name: state === 'emitida' ? 'Emitidas' :
            state === 'nota_credito' ? 'Notas de Crédito' :
            state === 'nota_debito' ? 'Notas de Débito' :
            state,
      value: data.total,
      count: data.count,
      percentage: percentage
    };
  }).sort((a, b) => b.value - a.value);

  // Colors for pie chart segments
  const pieColors = [
    'bg-blue-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500'
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Análisis detallado y reportes de tu sistema de facturación
          </p>
        </div>
        <div className="flex gap-2">
          <BcvRateBadge />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Receipt className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Facturas del Mes</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{totalFacturas}</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {format(new Date(), 'MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Ventas Totales</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{formatVES(totalVentasVES)}</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  {formatUSD(totalVentasUSD)} USD ref.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Calculator className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">IGTF Acumulado</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{formatVES(totalIGTF)}</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  3% de transacciones USD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Ticket Promedio</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{formatVES(promedioFactura)}</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Por factura emitida
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trends Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tendencias de Ventas
          </CardTitle>
          <CardDescription>
            Evolución de ventas e cantidad de facturas en los últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Simple bar chart visualization */}
            <div className="grid gap-4">
              {monthlySalesData.map((month, index) => {
                const maxSales = Math.max(...monthlySalesData.map(m => m.ventas));
                const percentage = maxSales > 0 ? (month.ventas / maxSales) * 100 : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{month.name}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{month.facturas} facturas</span>
                        <span>{formatVES(month.ventas)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {month.ventas > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Promedio por factura: {formatVES(month.promedio)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary insights */}
            {monthlySalesData.length > 1 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Análisis de Tendencia</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const currentMonth = monthlySalesData[monthlySalesData.length - 1];
                    const previousMonth = monthlySalesData[monthlySalesData.length - 2];
                    const growth = previousMonth.ventas > 0
                      ? ((currentMonth.ventas - previousMonth.ventas) / previousMonth.ventas) * 100
                      : 0;

                    if (growth > 0) {
                      return `Crecimiento del ${growth.toFixed(1)}% respecto al mes anterior`;
                    } else if (growth < 0) {
                      return `Disminución del ${Math.abs(growth).toFixed(1)}% respecto al mes anterior`;
                    } else {
                      return "Ventas estables respecto al mes anterior";
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Distribution Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Distribución de Ventas
          </CardTitle>
          <CardDescription>
            Desglose de ventas por tipo de documento fiscal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie chart visualization */}
            <div className="space-y-4">
              <div className="relative">
                <div className="w-48 h-48 mx-auto">
                  {/* Simple pie chart using CSS gradients */}
                  <div className="w-full h-full rounded-full relative overflow-hidden">
                    {salesDistributionData.length > 0 ? (
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: salesDistributionData.length === 1
                            ? '#3b82f6'
                            : `conic-gradient(
                                ${salesDistributionData.map((item, index) => {
                                  const startAngle = salesDistributionData
                                    .slice(0, index)
                                    .reduce((sum, prevItem) => sum + prevItem.percentage, 0);
                                  const endAngle = startAngle + item.percentage;
                                  const colors = ['#3b82f6', '#ef4444', '#eab308', '#22c55e', '#a855f7', '#f97316'];
                                  return `${colors[index % colors.length]} ${startAngle * 3.6}deg ${endAngle * 3.6}deg`;
                                }).join(', ')}
                              )`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {salesDistributionData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-3 h-3 rounded-full ${pieColors[index % pieColors.length]}`}
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution details */}
            <div className="space-y-4">
              <h4 className="font-medium">Detalle de Distribución</h4>
              {salesDistributionData.length > 0 ? (
                <div className="space-y-3">
                  {salesDistributionData.map((item, index) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${pieColors[index % pieColors.length]}`}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatVES(item.value)}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.count} documento{item.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${pieColors[index % pieColors.length]}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay datos suficientes para mostrar la distribución</p>
                </div>
              )}

              {/* Summary insights */}
              {salesDistributionData.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Análisis de Distribución</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Tipo dominante: <span className="font-medium">{salesDistributionData[0]?.name}</span>
                      ({salesDistributionData[0]?.percentage.toFixed(1)}% del total)
                    </div>
                    <div>
                      Total de tipos de documentos: {salesDistributionData.length}
                    </div>
                    <div>
                      Valor promedio por documento: {formatVES(totalVentasVES / Math.max(totalFacturas, 1))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Categories */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Reportes Disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {reportCards.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.title} className={cn(
                "transition-all hover:shadow-lg",
                report.disabled && "opacity-60 cursor-not-allowed"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg text-white", report.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                    </div>
                    {!report.disabled && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={report.href}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{report.stats}</Badge>
                    {report.disabled && (
                      <Badge variant="secondary">Próximamente</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Generar Reporte Personalizado
          </CardTitle>
          <CardDescription>
            Selecciona los parámetros para generar un reporte específico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ventas">Resumen de Ventas</SelectItem>
                  <SelectItem value="igtf">Detalle IGTF</SelectItem>
                  <SelectItem value="clientes">Análisis de Clientes</SelectItem>
                  <SelectItem value="productos">Productos más Vendidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Generar Excel
            </Button>
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Ver Vista Previa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Preview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas facturas emitidas - vista rápida para análisis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 min-w-0 sm:w-64">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Buscar por número, cliente o RIF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay facturas registradas aún
                  </TableCell>
                </TableRow>
              ) : (
                recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.numero}</TableCell>
                    <TableCell>{invoice.receptor.razonSocial}</TableCell>
                    <TableCell>{formatDateVE(invoice.fecha)}</TableCell>
                    <TableCell className="font-mono">{formatVES(invoice.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.estado === 'emitida' ? 'default' :
                          invoice.estado === 'nota_credito' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {invoice.estado === 'emitida' ? 'Emitida' :
                         invoice.estado === 'nota_credito' ? 'Nota Crédito' :
                         invoice.estado === 'nota_debito' ? 'Nota Débito' :
                         invoice.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}