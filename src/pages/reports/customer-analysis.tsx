import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowLeft,
  Download,
  Star,
  Clock,
  Target,
  Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
import { useInvoices } from '@/api/invoices';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { cn } from '@/lib/utils';
import { startOfYear, endOfYear, subMonths, differenceInDays } from 'date-fns';

interface CustomerMetrics {
  id: string;
  razonSocial: string;
  rif: string;
  totalCompras: number;
  numeroFacturas: number;
  ticketPromedio: number;
  ultimaCompra: string;
  diasSinComprar: number;
  fidelidad: 'Alto' | 'Medio' | 'Bajo';
  tendencia: 'Creciente' | 'Estable' | 'Decreciente';
}

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgSpending: number;
  color: string;
}

export function CustomerAnalysisPage() {
  const [period, setPeriod] = useState<string>('thisYear');
  const [sortBy, setSortBy] = useState<string>('totalCompras');

  const { data: bcvRate } = useBcvRate();
  const { data: invoices = [] } = useInvoices();

  // Filtrar facturas por período
  const getFilteredInvoices = () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'thisYear':
        startDate = startOfYear(now);
        break;
      case 'last6months':
        startDate = subMonths(now, 6);
        break;
      case 'last12months':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = startOfYear(now);
    }

    return invoices.filter(invoice => new Date(invoice.fecha) >= startDate);
  };

  const filteredInvoices = getFilteredInvoices();

  // Generar métricas por cliente
  const generateCustomerMetrics = (): CustomerMetrics[] => {
    const customerMap = new Map<string, {
      cliente: any;
      facturas: any[];
      totalCompras: number;
    }>();

    // Agrupar facturas por cliente
    filteredInvoices.forEach(invoice => {
      const clienteId = invoice.receptor.id || invoice.receptor.rif;
      const existing = customerMap.get(clienteId) || {
        cliente: invoice.receptor,
        facturas: [],
        totalCompras: 0
      };

      existing.facturas.push(invoice);
      existing.totalCompras += invoice.total;
      customerMap.set(clienteId, existing);
    });

    // Convertir a métricas
    const metrics: CustomerMetrics[] = Array.from(customerMap.entries()).map(([id, data]) => {
      const numeroFacturas = data.facturas.length;
      const ticketPromedio = numeroFacturas > 0 ? data.totalCompras / numeroFacturas : 0;

      // Última compra
      const fechasCompra = data.facturas.map(f => new Date(f.fecha)).sort((a, b) => b.getTime() - a.getTime());
      const ultimaCompra = fechasCompra[0];
      const diasSinComprar = ultimaCompra ? differenceInDays(new Date(), ultimaCompra) : 999;

      // Clasificar fidelidad
      let fidelidad: 'Alto' | 'Medio' | 'Bajo' = 'Bajo';
      if (numeroFacturas >= 10 && diasSinComprar <= 30) fidelidad = 'Alto';
      else if (numeroFacturas >= 5 && diasSinComprar <= 60) fidelidad = 'Medio';

      // Calcular tendencia (comparar últimos 3 meses vs 3 anteriores)
      const tresMesesAtras = subMonths(new Date(), 3);
      const seisMesesAtras = subMonths(new Date(), 6);

      const ventasRecientes = data.facturas
        .filter(f => new Date(f.fecha) >= tresMesesAtras)
        .reduce((sum, f) => sum + f.total, 0);

      const ventasAnteriores = data.facturas
        .filter(f => new Date(f.fecha) >= seisMesesAtras && new Date(f.fecha) < tresMesesAtras)
        .reduce((sum, f) => sum + f.total, 0);

      let tendencia: 'Creciente' | 'Estable' | 'Decreciente' = 'Estable';
      if (ventasAnteriores > 0) {
        const cambio = (ventasRecientes - ventasAnteriores) / ventasAnteriores;
        if (cambio > 0.1) tendencia = 'Creciente';
        else if (cambio < -0.1) tendencia = 'Decreciente';
      }

      return {
        id,
        razonSocial: data.cliente.razonSocial,
        rif: data.cliente.rif,
        totalCompras: data.totalCompras,
        numeroFacturas,
        ticketPromedio,
        ultimaCompra: ultimaCompra ? ultimaCompra.toISOString() : '',
        diasSinComprar,
        fidelidad,
        tendencia
      };
    });

    // Ordenar según criterio seleccionado
    return metrics.sort((a, b) => {
      switch (sortBy) {
        case 'totalCompras':
          return b.totalCompras - a.totalCompras;
        case 'numeroFacturas':
          return b.numeroFacturas - a.numeroFacturas;
        case 'ticketPromedio':
          return b.ticketPromedio - a.ticketPromedio;
        case 'ultimaCompra':
          return new Date(b.ultimaCompra).getTime() - new Date(a.ultimaCompra).getTime();
        default:
          return b.totalCompras - a.totalCompras;
      }
    });
  };

  // Generar segmentación de clientes
  const generateCustomerSegments = (metrics: CustomerMetrics[]): CustomerSegment[] => {
    const totalCustomers = metrics.length;

    // Segmentar por volumen de compras
    const top10Percent = Math.ceil(totalCustomers * 0.1);
    const top30Percent = Math.ceil(totalCustomers * 0.3);

    const segments = [
      {
        segment: 'VIP (Top 10%)',
        count: top10Percent,
        customers: metrics.slice(0, top10Percent),
        color: 'bg-yellow-500'
      },
      {
        segment: 'Premium (10-30%)',
        count: top30Percent - top10Percent,
        customers: metrics.slice(top10Percent, top30Percent),
        color: 'bg-blue-500'
      },
      {
        segment: 'Regular (30-70%)',
        count: Math.ceil(totalCustomers * 0.4),
        customers: metrics.slice(top30Percent, Math.ceil(totalCustomers * 0.7)),
        color: 'bg-green-500'
      },
      {
        segment: 'Ocasional (70%+)',
        count: totalCustomers - Math.ceil(totalCustomers * 0.7),
        customers: metrics.slice(Math.ceil(totalCustomers * 0.7)),
        color: 'bg-gray-500'
      }
    ];

    return segments.map(seg => ({
      segment: seg.segment,
      count: seg.count,
      percentage: totalCustomers > 0 ? (seg.count / totalCustomers) * 100 : 0,
      avgSpending: seg.customers.length > 0 ?
        seg.customers.reduce((sum, c) => sum + c.totalCompras, 0) / seg.customers.length : 0,
      color: seg.color
    }));
  };

  const customerMetrics = generateCustomerMetrics();
  const customerSegments = generateCustomerSegments(customerMetrics);

  // Estadísticas generales
  const totalCustomers = customerMetrics.length;
  const totalRevenue = customerMetrics.reduce((sum, c) => sum + c.totalCompras, 0);
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const topCustomer = customerMetrics[0];

  const activosUltimos30 = customerMetrics.filter(c => c.diasSinComprar <= 30).length;
  const inactivosUltimos90 = customerMetrics.filter(c => c.diasSinComprar > 90).length;

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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análisis de Clientes</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Análisis de cartera y comportamiento de clientes
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisYear">Este año</SelectItem>
              <SelectItem value="last6months">Últimos 6 meses</SelectItem>
              <SelectItem value="last12months">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <BcvRateBadge />
        </div>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Users className="h-4 w-4 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Total Clientes</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  {activosUltimos30} activos (30d)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Valor Promedio</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{formatVES(avgCustomerValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Por cliente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Trophy className="h-4 w-4 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Top Cliente</div>
                <div className="text-sm sm:text-base font-bold truncate">
                  {topCustomer ? topCustomer.razonSocial : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topCustomer && formatVES(topCustomer.totalCompras)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">Inactivos</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold">{inactivosUltimos90}</div>
                <p className="text-xs text-muted-foreground">
                  +90 días sin comprar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmentación de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Segmentación de Clientes
          </CardTitle>
          <CardDescription>
            Distribución de clientes por volumen de compras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerSegments.map((segment) => (
              <div key={segment.segment} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded", segment.color)} />
                  <div>
                    <div className="font-medium">{segment.segment}</div>
                    <div className="text-sm text-muted-foreground">
                      {segment.count} clientes ({segment.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{formatVES(segment.avgSpending)}</div>
                  <div className="text-xs text-muted-foreground">Promedio</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ranking de Clientes
              </CardTitle>
              <CardDescription>
                Top clientes ordenados por {sortBy === 'totalCompras' ? 'volumen de compras' :
                sortBy === 'numeroFacturas' ? 'número de facturas' :
                sortBy === 'ticketPromedio' ? 'ticket promedio' : 'última compra'}
              </CardDescription>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalCompras">Total Compras</SelectItem>
                <SelectItem value="numeroFacturas">Número Facturas</SelectItem>
                <SelectItem value="ticketPromedio">Ticket Promedio</SelectItem>
                <SelectItem value="ultimaCompra">Última Compra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {customerMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos de clientes para el período seleccionado
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total Compras</TableHead>
                      <TableHead>Facturas</TableHead>
                      <TableHead>Ticket Promedio</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Fidelidad</TableHead>
                      <TableHead>Tendencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerMetrics.slice(0, 20).map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <div>
                              <div className="font-medium">{customer.razonSocial}</div>
                              <div className="text-sm text-muted-foreground">{customer.rif}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{formatVES(customer.totalCompras)}</TableCell>
                        <TableCell>{customer.numeroFacturas}</TableCell>
                        <TableCell className="font-mono">{formatVES(customer.ticketPromedio)}</TableCell>
                        <TableCell>
                          {customer.ultimaCompra ? (
                            <div>
                              <div>{formatDateVE(customer.ultimaCompra)}</div>
                              <div className="text-xs text-muted-foreground">
                                Hace {customer.diasSinComprar} días
                              </div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.fidelidad === 'Alto' ? 'default' :
                              customer.fidelidad === 'Medio' ? 'secondary' : 'outline'
                            }
                            className={
                              customer.fidelidad === 'Alto' ? 'bg-green-100 text-green-800' :
                              customer.fidelidad === 'Medio' ? 'bg-yellow-100 text-yellow-800' : ''
                            }
                          >
                            {customer.fidelidad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.tendencia === 'Creciente' ? 'default' :
                              customer.tendencia === 'Decreciente' ? 'destructive' : 'secondary'
                            }
                            className={
                              customer.tendencia === 'Creciente' ? 'bg-green-100 text-green-800' : ''
                            }
                          >
                            {customer.tendencia}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid gap-3">
                {customerMetrics.slice(0, 10).map((customer, index) => (
                  <Card key={customer.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{customer.razonSocial}</div>
                            <div className="text-sm text-muted-foreground">{customer.rif}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Total</div>
                            <div className="font-mono">{formatVES(customer.totalCompras)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Facturas</div>
                            <div>{customer.numeroFacturas}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge
                            variant={
                              customer.fidelidad === 'Alto' ? 'default' :
                              customer.fidelidad === 'Medio' ? 'secondary' : 'outline'
                            }
                            className={
                              customer.fidelidad === 'Alto' ? 'bg-green-100 text-green-800' :
                              customer.fidelidad === 'Medio' ? 'bg-yellow-100 text-yellow-800' : ''
                            }
                          >
                            {customer.fidelidad}
                          </Badge>
                          <Badge
                            variant={
                              customer.tendencia === 'Creciente' ? 'default' :
                              customer.tendencia === 'Decreciente' ? 'destructive' : 'secondary'
                            }
                            className={
                              customer.tendencia === 'Creciente' ? 'bg-green-100 text-green-800' : ''
                            }
                          >
                            {customer.tendencia}
                          </Badge>
                        </div>

                        {customer.ultimaCompra && (
                          <div className="text-sm">
                            <div className="text-muted-foreground">Última compra</div>
                            <div>{formatDateVE(customer.ultimaCompra)} (hace {customer.diasSinComprar} días)</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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
              <Star className="mr-2 h-4 w-4" />
              Campaña de Reactivación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerAnalysisPage;