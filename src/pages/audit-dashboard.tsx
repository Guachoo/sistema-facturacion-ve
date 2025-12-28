import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  Monitor,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  AuditEntry,
  AuditFilter,
  AuditStats,
  AuditAction,
  RiskLevel,
  useAuditSystem
} from '@/lib/audit-system';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export function AuditDashboardPage() {
  const { getAuditLogs, getAuditStats } = useAuditSystem();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AuditFilter>({
    limit: 100,
    offset: 0
  });

  // Filtros de UI
  const [selectedAction, setSelectedAction] = useState<AuditAction | 'all'>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const riskColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626'
  };

  const actionLabels: Record<AuditAction, string> = {
    login: 'Inicio de Sesión',
    logout: 'Cierre de Sesión',
    failed_login: 'Login Fallido',
    password_change: 'Cambio de Contraseña',
    create_invoice: 'Crear Factura',
    update_invoice: 'Actualizar Factura',
    delete_invoice: 'Eliminar Factura',
    void_invoice: 'Anular Factura',
    create_customer: 'Crear Cliente',
    update_customer: 'Actualizar Cliente',
    delete_customer: 'Eliminar Cliente',
    create_item: 'Crear Item',
    update_item: 'Actualizar Item',
    delete_item: 'Eliminar Item',
    create_user: 'Crear Usuario',
    update_user: 'Actualizar Usuario',
    delete_user: 'Eliminar Usuario',
    change_permissions: 'Cambiar Permisos',
    backup_created: 'Backup Creado',
    backup_restored: 'Backup Restaurado',
    config_changed: 'Configuración Cambiada',
    export_data: 'Exportar Datos',
    import_data: 'Importar Datos',
    report_generated: 'Reporte Generado',
    company_switch: 'Cambio de Empresa',
    permission_denied: 'Permiso Denegado',
    session_expired: 'Sesión Expirada'
  };

  const riskLabels: Record<RiskLevel, string> = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    critical: 'Crítico'
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, stats] = await Promise.all([
        getAuditLogs(filter),
        getAuditStats(filter)
      ]);
      setAuditLogs(logs);
      setAuditStats(stats);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const newFilter: AuditFilter = {
      limit: 100,
      offset: 0
    };

    if (selectedAction !== 'all') {
      newFilter.actions = [selectedAction];
    }

    if (selectedRiskLevel !== 'all') {
      newFilter.riskLevels = [selectedRiskLevel];
    }

    if (selectedUser !== 'all') {
      newFilter.userId = selectedUser;
    }

    if (dateFrom) {
      newFilter.dateFrom = dateFrom;
    }

    if (dateTo) {
      newFilter.dateTo = dateTo;
    }

    setFilter(newFilter);
  };

  const resetFilters = () => {
    setSelectedAction('all');
    setSelectedRiskLevel('all');
    setSelectedUser('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchTerm('');
    setFilter({ limit: 100, offset: 0 });
  };

  const exportAuditLogs = () => {
    const csv = [
      ['Fecha', 'Usuario', 'Acción', 'Recurso', 'Nivel de Riesgo', 'Éxito', 'IP', 'Empresa'].join(','),
      ...auditLogs.map(log => [
        log.timestamp.toISOString(),
        log.userName,
        actionLabels[log.action],
        log.resource || '',
        riskLabels[log.riskLevel],
        log.success ? 'Sí' : 'No',
        log.ipAddress,
        log.companyRif || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = auditLogs.filter(log => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.userName.toLowerCase().includes(term) ||
        log.userEmail.toLowerCase().includes(term) ||
        actionLabels[log.action].toLowerCase().includes(term) ||
        (log.resource && log.resource.toLowerCase().includes(term))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Auditoría</h1>
          <p className="text-muted-foreground">
            Monitoreo de seguridad y actividad del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={exportAuditLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      {auditStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditStats.totalEvents.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditStats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {auditStats.riskDistribution.critical + auditStats.riskDistribution.high}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispositivos Únicos</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditStats.deviceStats.uniqueDevices}</div>
              <p className="text-xs text-muted-foreground">
                {auditStats.deviceStats.suspiciousDevices} sospechosos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Acción</label>
              <Select value={selectedAction} onValueChange={(value) => setSelectedAction(value as AuditAction | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {Object.entries(actionLabels).map(([action, label]) => (
                    <SelectItem key={action} value={action}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Nivel de Riesgo</label>
              <Select value={selectedRiskLevel} onValueChange={(value) => setSelectedRiskLevel(value as RiskLevel | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los niveles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {Object.entries(riskLabels).map(([level, label]) => (
                    <SelectItem key={level} value={level}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Desde</label>
              <DatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="Fecha inicio"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Hasta</label>
              <DatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="Fecha fin"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Input
              placeholder="Buscar usuario, email, acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={applyFilters}>Aplicar Filtros</Button>
            <Button variant="outline" onClick={resetFilters}>Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      {auditStats && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Distribución por nivel de riesgo */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(auditStats.riskDistribution).map(([level, count]) => ({
                      name: riskLabels[level as RiskLevel],
                      value: count,
                      fill: riskColors[level as RiskLevel]
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(auditStats.riskDistribution).map(([level], index) => (
                      <Cell key={`cell-${index}`} fill={riskColors[level as RiskLevel]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Más Frecuentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={auditStats.topActions.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="action"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, 'Eventos']}
                    labelFormatter={(value: string) => actionLabels[value as AuditAction]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribución por hora */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={auditStats.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [value, 'Eventos']}
                    labelFormatter={(hour) => `${hour}:00`}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Más Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditStats.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.userName}</p>
                        <p className="text-sm text-muted-foreground">{user.userId}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{user.count} eventos</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de logs de auditoría */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoría</CardTitle>
          <CardDescription>
            Mostrando {filteredLogs.length} de {auditLogs.length} eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.success ? "default" : "destructive"}
                      style={{ backgroundColor: log.success ? riskColors[log.riskLevel] : undefined }}
                    >
                      {riskLabels[log.riskLevel]}
                    </Badge>
                    <span className="font-medium">{actionLabels[log.action]}</span>
                    {!log.success && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {log.timestamp.toLocaleString()}
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{log.userName} ({log.userEmail})</span>
                  </div>

                  {log.resource && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Recurso:</span>
                      <span>{log.resource}</span>
                      {log.resourceId && <span className="text-muted-foreground">ID: {log.resourceId}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">IP: {log.ipAddress}</span>
                    {log.companyRif && (
                      <span className="text-muted-foreground">Empresa: {log.companyRif}</span>
                    )}
                    {log.duration && (
                      <span className="text-muted-foreground">Duración: {log.duration}ms</span>
                    )}
                  </div>

                  {log.errorMessage && (
                    <div className="text-red-600 text-xs bg-red-50 p-2 rounded">
                      {log.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}