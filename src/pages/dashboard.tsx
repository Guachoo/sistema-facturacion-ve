import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Plus,
  FileText,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { formatVES, formatUSD, formatNumber } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';

// Mock KPI data
const kpis = {
  totalVentasMes: 2580000, // VES
  porcentajeUSD: 35, // %
  igtfPeriodo: 23400, // VES
  numeroFacturas: 127,
  ticketPromedio: 20315, // VES
};

const mockChartData = [
  { day: 1, sales: 85000 },
  { day: 2, sales: 92000 },
  { day: 3, sales: 78000 },
  { day: 4, sales: 105000 },
  { day: 5, sales: 88000 },
  { day: 6, sales: 110000 },
  { day: 7, sales: 95000 },
];

export function DashboardPage() {
  const { data: bcvRate } = useBcvRate();

  const totalUsdReferencia = bcvRate ? kpis.totalVentasMes / bcvRate.rate : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Resumen de tu actividad de facturación
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <BcvRateBadge />
          <Button asChild className="w-full sm:w-auto">
            <Link to="/facturas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVES(kpis.totalVentasMes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Equivalente: {formatUSD(totalUsdReferencia)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              % Operaciones USD
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.porcentajeUSD}%</div>
            <p className="text-xs text-muted-foreground">
              Del total de transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              IGTF del Período
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVES(kpis.igtfPeriodo)}
            </div>
            <p className="text-xs text-muted-foreground">
              Impuesto sobre transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Emitidas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.numeroFacturas}</div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio: {formatVES(kpis.ticketPromedio)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ventas por Día</CardTitle>
            <CardDescription>
              Últimos 7 días de actividad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-2">
              {mockChartData.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 bg-gradient-to-t from-blue-600 to-teal-600 rounded-t-sm"
                    style={{
                      height: `${(item.sales / Math.max(...mockChartData.map(d => d.sales))) * 200}px`
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>
              Acciones frecuentes para agilizar tu trabajo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/facturas/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Factura
                <ArrowUpRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/clientes">
                <Users className="mr-2 h-4 w-4" />
                Gestionar Clientes
                <ArrowUpRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/reportes/libro-ventas">
                <BarChart3 className="mr-2 h-4 w-4" />
                Libro de Ventas
                <ArrowUpRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Sistema operativo
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}