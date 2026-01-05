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
import { EurRateBadge } from '@/components/ui/eur-rate-badge';
import { useFacturas } from '@/api/facturas';

export function DashboardPage() {
  const { data: bcvRate } = useBcvRate();
  const { data: facturas = [] } = useFacturas();

  // Calcular KPIs desde las facturas reales
  const facturasEmitidas = facturas.filter(f => f.estado === 'emitida' && !f.anulado);

  const totalVentasMes = facturasEmitidas.reduce((sum, f) => sum + f.total_a_pagar, 0);
  const totalIGTF = facturasEmitidas.reduce((sum, f) => sum + (f.monto_igtf || 0), 0);
  const numeroFacturas = facturasEmitidas.length;
  const ticketPromedio = numeroFacturas > 0 ? totalVentasMes / numeroFacturas : 0;

  // Calcular % de operaciones en USD
  const facturasConUSD = facturasEmitidas.filter(f => f.total_a_pagar_usd && f.total_a_pagar_usd > 0).length;
  const porcentajeUSD = numeroFacturas > 0 ? (facturasConUSD / numeroFacturas) * 100 : 0;

  const totalUsdReferencia = bcvRate ? totalVentasMes / bcvRate.rate : 0;

  // Calcular ventas por día de los últimos 7 días
  const today = new Date();
  const chartData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Sumar ventas de ese día
    const salesOfDay = facturasEmitidas
      .filter(f => f.created_at && f.created_at.split('T')[0] === dateStr)
      .reduce((sum, f) => sum + f.total_a_pagar, 0);

    chartData.push({
      day: date.getDate(),
      sales: salesOfDay,
      dateStr: dateStr
    });
  }

  const maxSales = Math.max(...chartData.map(d => d.sales), 1); // Evitar división por 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Principal</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Resumen de tu actividad de facturación
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex gap-2">
            <BcvRateBadge />
            <EurRateBadge />
          </div>
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
              {formatVES(totalVentasMes)}
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
            <div className="text-2xl font-bold">{porcentajeUSD.toFixed(1)}%</div>
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
              {formatVES(totalIGTF)}
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
            <div className="text-2xl font-bold">{numeroFacturas}</div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio: {formatVES(ticketPromedio)}
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
              {chartData.map((item, index) => {
                const barHeight = item.sales > 0 ? (item.sales / maxSales) * 250 : 5;
                return (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-teal-600 rounded-t-sm transition-all hover:opacity-80 cursor-pointer"
                      style={{
                        height: `${barHeight}px`,
                        minHeight: item.sales > 0 ? '5px' : '2px'
                      }}
                      title={`${item.dateStr}: ${formatVES(item.sales)}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.day}
                    </span>
                  </div>
                );
              })}
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