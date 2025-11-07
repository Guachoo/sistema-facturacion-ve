import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Plus,
  FileText,
  BarChart3,
  ArrowUpRight,
  AlertTriangle,
  X,
  CheckCircle,
  Info,
  AlertCircle,
  Mail,
  Bell,
  Clock,
  Send
} from 'lucide-react';
import { formatVES, formatUSD, formatNumber } from '@/lib/formatters';
import { useBcvRate } from '@/api/rates';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { useFilteredAlerts, useSimpleSystemStatus } from '@/hooks/use-notifications-simple';
import { useAlertIcons } from '@/hooks/use-notification-helpers';

// Mock KPI data
const kpis = {
  totalVentasMes: 2580000, // VES
  porcentajeUSD: 35, // %
  igtfPeriodo: 23400, // VES
  numeroFacturas: 127,
  ticketPromedio: 20315, // VES
};

// FASE 7: KPIs Fiscales
const fiscalKpis = {
  ivaGenerado: 412800, // VES
  baseImponible: 2580000, // VES
  tasaIvaPromedio: 16.0, // %
  facturasPorEstado: {
    emitidas: 115,
    anuladas: 8,
    notasCredito: 3,
    notasDebito: 1
  },
  cumplimientoSeniat: 98.5, // %
  numeroControlRestante: 373,
  ventasExentas: 85000, // VES
  retencionesIva: 15600 // VES
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

  // Usando hooks simplificados sin intervals automáticos para evitar spam de logs
  const { alerts, dismissAlert } = useFilteredAlerts({
    severidad: 'error',
    maxItems: 3,
    enabled: true
  });
  const { systemStatus, lastUpdate } = useSimpleSystemStatus(true);
  const { getAlertIcon, getAlertVariant } = useAlertIcons();

  const totalUsdReferencia = bcvRate ? kpis.totalVentasMes / bcvRate.rate : 0;

  // Los alerts ya están limitados por el hook optimizado
  const visibleAlerts = alerts;

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

      {/* Alertas Fiscales */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Fiscales Activas
          </h2>
          <div className="space-y-3">
            {visibleAlerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.tipo);
              return (
                <Alert key={alert.id} variant={getAlertVariant(alert.severidad)}>
                  <AlertIcon className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <div className="font-medium">{alert.titulo}</div>
                      <div className="text-sm mt-1">{alert.descripcion}</div>
                      {alert.documento_afectado && (
                        <div className="text-xs mt-2 space-x-2">
                          <Badge variant="outline">
                            {alert.documento_afectado.numero_documento}
                          </Badge>
                          <Badge variant="secondary">
                            {alert.severidad}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-2 sm:p-4 md:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Ventas del Mes</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">
                  {formatVES(kpis.totalVentasMes)}
                </div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  ≈ {formatUSD(totalUsdReferencia)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-4 md:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">% USD</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{kpis.porcentajeUSD}%</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Del total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-4 md:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <Receipt className="h-4 w-4 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">IGTF</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">
                  {formatVES(kpis.igtfPeriodo)}
                </div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Período
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-4 md:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Facturas</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{kpis.numeroFacturas}</div>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Promedio: {formatVES(kpis.ticketPromedio)}
                </p>
              </div>
            </div>
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

      {/* Dashboard en Tiempo Real */}
      {systemStatus && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Estado del Sistema en Tiempo Real</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Última actualización: {lastUpdate?.toLocaleTimeString('es-VE') || 'Cargando...'}
            </div>
          </div>

          {/* Métricas del Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* SENIAT Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${
                    systemStatus.seniat.estado === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  SENIAT
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Estado:</span>
                  <Badge variant={systemStatus.seniat.estado === 'online' ? 'default' : 'destructive'}>
                    {systemStatus.seniat.estado}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tiempo respuesta:</span>
                  <span className="font-mono">{systemStatus.seniat.tiempo_respuesta_ms}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Docs pendientes:</span>
                  <span className="font-mono">{systemStatus.seniat.documentos_pendientes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Procesados hoy:</span>
                  <span className="font-mono">{systemStatus.seniat.documentos_procesados_hoy}</span>
                </div>
              </CardContent>
            </Card>

            {/* TFHKA Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${
                    systemStatus.tfhka.estado === 'conectado' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  TFHKA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Estado:</span>
                  <Badge variant={systemStatus.tfhka.estado === 'conectado' ? 'default' : 'destructive'}>
                    {systemStatus.tfhka.estado}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Enviados hoy:</span>
                  <span className="font-mono">{systemStatus.tfhka.documentos_enviados_hoy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Confirmados hoy:</span>
                  <span className="font-mono">{systemStatus.tfhka.documentos_confirmados_hoy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tiempo respuesta:</span>
                  <span className="font-mono">{systemStatus.tfhka.tiempo_respuesta_promedio_ms}ms</span>
                </div>
              </CardContent>
            </Card>

            {/* Sistema Local */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  Sistema Local
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Docs emitidos:</span>
                  <span className="font-mono">{systemStatus.sistema_local.documentos_emitidos_hoy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Emails enviados:</span>
                  <span className="font-mono">{systemStatus.sistema_local.emails_enviados_hoy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Alertas activas:</span>
                  <span className="font-mono text-red-600">{systemStatus.sistema_local.alertas_activas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Usuarios conectados:</span>
                  <span className="font-mono">{systemStatus.sistema_local.usuarios_conectados}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uso disco:</span>
                  <span className="font-mono">{systemStatus.sistema_local.espacio_disco_usado_porcentaje}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas de Rendimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métricas de Rendimiento</CardTitle>
              <CardDescription>Indicadores de rendimiento del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Tiempo Emisión</div>
                  <div className="text-xl font-bold">{systemStatus.metricas_rendimiento.tiempo_emision_promedio_ms}ms</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Éxito Email</div>
                  <div className="text-xl font-bold text-green-600">{systemStatus.metricas_rendimiento.tasa_exito_email}%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Éxito SENIAT</div>
                  <div className="text-xl font-bold text-blue-600">{systemStatus.metricas_rendimiento.tasa_exito_seniat}%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Docs/min</div>
                  <div className="text-xl font-bold">{systemStatus.metricas_rendimiento.documentos_por_minuto}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard de Notificaciones - FASE 6 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actividad de Emails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Actividad de Email
                </CardTitle>
                <CardDescription>Resumen de envíos automáticos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Facturas enviadas hoy</span>
                    <Badge variant="secondary" className="font-mono">
                      {systemStatus.sistema_local.emails_enviados_hoy}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Notificaciones de estado</span>
                    <Badge variant="outline" className="font-mono">3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recordatorios pendientes</span>
                    <Badge variant="destructive" className="font-mono">2</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tasa de entrega</span>
                    <Badge variant="default" className="font-mono">
                      {systemStatus.metricas_rendimiento.tasa_exito_email}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas y Notificaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alertas y Notificaciones
                </CardTitle>
                <CardDescription>Estado del sistema de alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Alertas activas</span>
                    <Badge variant="destructive" className="font-mono">
                      {systemStatus.sistema_local.alertas_activas}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Facturas vencidas</span>
                    <Badge variant="outline" className="font-mono">5</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Números de control restantes</span>
                    <Badge
                      variant={parseInt(systemStatus.sistema_local.alertas_activas) > 50 ? "default" : "destructive"}
                      className="font-mono"
                    >
                      {parseInt(systemStatus.sistema_local.alertas_activas) > 50 ? '373' : '15'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Estado SENIAT</span>
                    <Badge variant="default" className="bg-green-600">Conectado</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FASE 7: KPIs Fiscales */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Indicadores Fiscales</h2>

            {/* KPIs Fiscales Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Receipt className="h-8 w-8 text-green-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground">IVA Generado</div>
                      <div className="text-lg font-bold text-green-600">
                        {formatVES(fiscalKpis.ivaGenerado)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fiscalKpis.tasaIvaPromedio}% promedio
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground">Base Imponible</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatVES(fiscalKpis.baseImponible)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Período actual
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground">Cumplimiento SENIAT</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {fiscalKpis.cumplimientoSeniat}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estado: Excelente
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground">Núms. Control</div>
                      <div className="text-lg font-bold text-orange-600">
                        {fiscalKpis.numeroControlRestante}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Restantes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desglose de Documentos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado de Documentos</CardTitle>
                  <CardDescription>Distribución por tipo de documento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Facturas Emitidas</span>
                      <Badge variant="default" className="font-mono">
                        {fiscalKpis.facturasPorEstado.emitidas}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Facturas Anuladas</span>
                      <Badge variant="destructive" className="font-mono">
                        {fiscalKpis.facturasPorEstado.anuladas}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Notas de Crédito</span>
                      <Badge variant="secondary" className="font-mono">
                        {fiscalKpis.facturasPorEstado.notasCredito}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Notas de Débito</span>
                      <Badge variant="outline" className="font-mono">
                        {fiscalKpis.facturasPorEstado.notasDebito}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/reportes/fiscal-analysis">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Ver Análisis Completo
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impuestos y Retenciones</CardTitle>
                  <CardDescription>Desglose tributario del período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Ventas Exentas</span>
                      <span className="font-mono text-sm">
                        {formatVES(fiscalKpis.ventasExentas)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Retenciones de IVA</span>
                      <span className="font-mono text-sm">
                        {formatVES(fiscalKpis.retencionesIva)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">IGTF Recaudado</span>
                      <span className="font-mono text-sm">
                        {formatVES(kpis.igtfPeriodo)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tasa IVA Promedio</span>
                      <Badge variant="default" className="font-mono">
                        {fiscalKpis.tasaIvaPromedio}%
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/reportes/iva-mensual">
                        <Receipt className="mr-2 h-4 w-4" />
                        Ver Declaración IVA
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actividad Reciente de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>Últimas notificaciones enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div>
                      <div className="text-sm font-medium">Factura INV-2025-001 enviada por email</div>
                      <div className="text-xs text-muted-foreground">Enviada a cliente@empresa.com</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hace 5 min</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <div>
                      <div className="text-sm font-medium">Notificación de anulación enviada</div>
                      <div className="text-xs text-muted-foreground">Factura INV-2025-002 anulada</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hace 15 min</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <div>
                      <div className="text-sm font-medium">Recordatorio de pago enviado</div>
                      <div className="text-xs text-muted-foreground">3 facturas vencidas</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hace 1 hora</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    <div>
                      <div className="text-sm font-medium">Nota de crédito generada</div>
                      <div className="text-xs text-muted-foreground">NC-2025-001 por Bs. 125,000</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hace 2 horas</div>
                </div>

                <div className="text-center pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/configuracion">
                      <Send className="mr-2 h-4 w-4" />
                      Configurar Notificaciones
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}