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
  Filter
} from 'lucide-react';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
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
    stats: 'Últimos 30 días'
  },
  {
    title: 'Reporte IGTF',
    description: 'Impuesto a las Grandes Transacciones Financieras',
    icon: Calculator,
    href: '/reportes/igtf',
    color: 'bg-orange-500',
    stats: 'Transacciones en USD'
  },
  {
    title: 'Análisis de Ventas',
    description: 'Tendencias y patrones de facturación por período',
    icon: TrendingUp,
    href: '#',
    color: 'bg-green-500',
    stats: 'Comparativo mensual',
    disabled: true
  },
  {
    title: 'Reporte de Clientes',
    description: 'Análisis de cartera y comportamiento de clientes',
    icon: Users,
    href: '#',
    color: 'bg-purple-500',
    stats: 'Top 10 clientes',
    disabled: true
  }
];

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [reportType, setReportType] = useState<string>('ventas');

  const { data: bcvRate } = useBcvRate();
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
  const totalVentasUSD = bcvRate ? totalVentasVES / bcvRate.rate : 0;
  const totalIGTF = monthlyInvoices.reduce((sum, inv) => sum + inv.montoIgtf, 0);
  const promedioFactura = totalFacturas > 0 ? totalVentasVES / totalFacturas : 0;

  // Recent invoices for quick preview
  const recentInvoices = invoices.slice(0, 10);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas del Mes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFacturas}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totalVentasVES)}</div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(totalVentasUSD)} USD ref.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IGTF Acumulado</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totalIGTF)}</div>
            <p className="text-xs text-muted-foreground">
              3% de transacciones USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(promedioFactura)}</div>
            <p className="text-xs text-muted-foreground">
              Por factura emitida
            </p>
          </CardContent>
        </Card>
      </div>

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
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Últimas facturas emitidas - vista rápida para análisis
          </CardDescription>
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