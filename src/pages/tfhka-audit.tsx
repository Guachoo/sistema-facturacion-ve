// TFHKA Audit Panel
// Complete audit trail for TFHKA operations and fiscal document tracking

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  FileText,
  User,
  Calendar,
  Activity,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Loader2
} from 'lucide-react';
import { formatDateVE, formatNumber } from '@/lib/formatters';
import { toast } from 'sonner';

// Mock data structure for TFHKA audit records
interface TfhkaAuditRecord {
  id: string;
  documentType: 'invoice' | 'credit_note' | 'debit_note' | 'customer_sync';
  documentId: string;
  documentNumber: string;
  tfhkaOperation: string;
  tfhkaDocumentId?: string;
  status: 'pending' | 'success' | 'error' | 'retry';
  errorMessage?: string;
  retryCount: number;
  requestTimestamp: string;
  responseTimestamp?: string;
  userId?: string;
  userName?: string;
  tfhkaRequest: any;
  tfhkaResponse: any;
}

const mockAuditRecords: TfhkaAuditRecord[] = [
  {
    id: '1',
    documentType: 'invoice',
    documentId: 'inv-001',
    documentNumber: 'A-000001',
    tfhkaOperation: 'create_document',
    tfhkaDocumentId: 'TFHKA-ABC123',
    status: 'success',
    retryCount: 0,
    requestTimestamp: '2024-01-20T10:30:00Z',
    responseTimestamp: '2024-01-20T10:30:15Z',
    userId: 'user-1',
    userName: 'Juan Pérez',
    tfhkaRequest: { numero: 'A-000001', total: 150000 },
    tfhkaResponse: { status: 'approved', qrCode: 'QR123456' }
  },
  {
    id: '2',
    documentType: 'customer_sync',
    documentId: 'cust-002',
    documentNumber: 'J-12345678-9',
    tfhkaOperation: 'sync_customer',
    status: 'error',
    errorMessage: 'RIF no encontrado en sistema TFHKA',
    retryCount: 2,
    requestTimestamp: '2024-01-20T09:15:00Z',
    userId: 'user-2',
    userName: 'María González',
    tfhkaRequest: { rif: 'J-12345678-9' },
    tfhkaResponse: { error: 'RIF_NOT_FOUND' }
  },
  {
    id: '3',
    documentType: 'credit_note',
    documentId: 'nc-001',
    documentNumber: 'NC-000001',
    tfhkaOperation: 'create_credit_note',
    status: 'pending',
    retryCount: 0,
    requestTimestamp: '2024-01-20T11:45:00Z',
    userId: 'user-1',
    userName: 'Juan Pérez',
    tfhkaRequest: { facturaOriginal: 'A-000001', monto: 50000 },
    tfhkaResponse: null
  }
];

const documentTypeLabels = {
  invoice: 'Factura',
  credit_note: 'Nota de Crédito',
  debit_note: 'Nota de Débito',
  customer_sync: 'Sincronización Cliente'
};

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  success: { label: 'Exitoso', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  retry: { label: 'Reintentando', color: 'bg-blue-100 text-blue-800', icon: RefreshCw }
};

export function TfhkaAuditPage() {
  const [selectedRecord, setSelectedRecord] = useState<TfhkaAuditRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDocumentType, setFilterDocumentType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Filter records based on current filters
  const filteredRecords = mockAuditRecords.filter(record => {
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (filterDocumentType !== 'all' && record.documentType !== filterDocumentType) return false;
    if (searchTerm && !record.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !record.tfhkaDocumentId?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: mockAuditRecords.length,
    success: mockAuditRecords.filter(r => r.status === 'success').length,
    error: mockAuditRecords.filter(r => r.status === 'error').length,
    pending: mockAuditRecords.filter(r => r.status === 'pending').length,
    successRate: (mockAuditRecords.filter(r => r.status === 'success').length / mockAuditRecords.length * 100).toFixed(1)
  };

  const handleRetryOperation = async (recordId: string) => {
    setIsRetrying(recordId);

    toast.info('Reintentando operación TFHKA...', {
      description: 'La operación será procesada nuevamente'
    });

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Implement retry logic here when API is available
      console.log('Retrying operation for record:', recordId);

      toast.success('Operación reintentada exitosamente');
    } catch (error) {
      console.error('Error retrying operation:', error);
      toast.error('Error al reintentar la operación', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsRetrying(null);
    }
  };

  const handleExportAudit = () => {
    toast.success('Exportando auditoría...', {
      description: 'El archivo se descargará en breve'
    });
    // Implement export logic
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge variant="secondary" className={config.color}>
        {getStatusIcon(status)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Auditoría TFHKA</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Seguimiento completo de operaciones con el sistema fiscal TFHKA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAudit}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
          <TabsTrigger value="errors">Errores</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operaciones</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.total)}</div>
                <p className="text-xs text-muted-foreground">
                  Últimos 7 días
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exitosas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatNumber(stats.success)}</div>
                <p className="text-xs text-muted-foreground">
                  Tasa de éxito: {stats.successRate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Con Errores</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatNumber(stats.error)}</div>
                <p className="text-xs text-muted-foreground">
                  Requieren atención
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(stats.pending)}</div>
                <p className="text-xs text-muted-foreground">
                  En procesamiento
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Operaciones Recientes</CardTitle>
              <CardDescription>
                Últimas operaciones realizadas con TFHKA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha/Hora
                    </TableHead>
                    <TableHead className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Usuario
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAuditRecords.slice(0, 5).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.documentNumber}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {documentTypeLabels[record.documentType]}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {record.tfhkaOperation}
                        </code>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateVE(new Date(record.requestTimestamp))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{record.userName || 'Sistema'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Buscar
                  </Label>
                  <Input
                    id="search"
                    placeholder="Número documento o ID TFHKA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Exitoso</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="retry">Reintentando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docType">Tipo Documento</Label>
                  <Select value={filterDocumentType} onValueChange={setFilterDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="invoice">Facturas</SelectItem>
                      <SelectItem value="credit_note">Notas de Crédito</SelectItem>
                      <SelectItem value="debit_note">Notas de Débito</SelectItem>
                      <SelectItem value="customer_sync">Sync Clientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Rango de Fechas
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                    <Input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todas las Operaciones</CardTitle>
              <CardDescription>
                {filteredRecords.length} operaciones encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Operación TFHKA</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Reintentos</TableHead>
                    <TableHead className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha/Hora
                    </TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Usuario
                    </TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const duration = record.responseTimestamp ?
                      Math.round((new Date(record.responseTimestamp).getTime() - new Date(record.requestTimestamp).getTime()) / 1000) :
                      null;

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.documentNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {documentTypeLabels[record.documentType]}
                            </div>
                            {record.tfhkaDocumentId && (
                              <div className="text-xs font-mono text-blue-600 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                {record.tfhkaDocumentId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {record.tfhkaOperation}
                          </code>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                          {record.errorMessage && (
                            <div className="text-xs text-red-600 mt-1">
                              {record.errorMessage}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.retryCount > 0 ? (
                            <Badge variant="outline" className="text-orange-600">
                              {record.retryCount}x
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(record.requestTimestamp).toLocaleString('es-VE')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {duration ? (
                            <span className="text-sm">{duration}s</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.userName || 'Sistema'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRecord(record)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalles de Operación TFHKA</DialogTitle>
                                  <DialogDescription>
                                    {record.documentNumber} - {record.tfhkaOperation}
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedRecord && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-medium">Información General</Label>
                                        <div className="space-y-2 mt-2 text-sm">
                                          <div><span className="font-medium">Documento:</span> {selectedRecord.documentNumber}</div>
                                          <div><span className="font-medium">Tipo:</span> {documentTypeLabels[selectedRecord.documentType]}</div>
                                          <div className="flex items-center gap-1">
                                            <span className="font-medium">ID TFHKA:</span>
                                            {selectedRecord.tfhkaDocumentId ? (
                                              <span className="flex items-center gap-1 text-blue-600">
                                                <ExternalLink className="h-3 w-3" />
                                                {selectedRecord.tfhkaDocumentId}
                                              </span>
                                            ) : (
                                              <span>N/A</span>
                                            )}
                                          </div>
                                          <div><span className="font-medium">Estado:</span> {getStatusBadge(selectedRecord.status)}</div>
                                          <div><span className="font-medium">Usuario:</span> {selectedRecord.userName || 'Sistema'}</div>
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="font-medium">Timestamps</Label>
                                        <div className="space-y-2 mt-2 text-sm">
                                          <div><span className="font-medium">Solicitud:</span> {new Date(selectedRecord.requestTimestamp).toLocaleString('es-VE')}</div>
                                          {selectedRecord.responseTimestamp && (
                                            <div><span className="font-medium">Respuesta:</span> {new Date(selectedRecord.responseTimestamp).toLocaleString('es-VE')}</div>
                                          )}
                                          <div><span className="font-medium">Reintentos:</span> {selectedRecord.retryCount}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="font-medium">Request TFHKA</Label>
                                      <pre className="mt-2 p-3 bg-gray-100 rounded-md text-sm overflow-x-auto">
                                        {JSON.stringify(selectedRecord.tfhkaRequest, null, 2)}
                                      </pre>
                                    </div>

                                    {selectedRecord.tfhkaResponse && (
                                      <div>
                                        <Label className="font-medium">Response TFHKA</Label>
                                        <pre className="mt-2 p-3 bg-gray-100 rounded-md text-sm overflow-x-auto">
                                          {JSON.stringify(selectedRecord.tfhkaResponse, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {selectedRecord.errorMessage && (
                                      <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{selectedRecord.errorMessage}</AlertDescription>
                                      </Alert>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {record.status === 'error' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetryOperation(record.id)}
                                disabled={isRetrying === record.id}
                              >
                                {isRetrying === record.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Operaciones con Errores
              </CardTitle>
              <CardDescription>
                Análisis de errores y problemas de integración TFHKA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockAuditRecords.filter(r => r.status === 'error').length > 0 ? (
                <div className="space-y-4">
                  {mockAuditRecords.filter(r => r.status === 'error').map((record) => (
                    <Alert key={record.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{record.documentNumber} - {record.tfhkaOperation}</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>{record.errorMessage}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Reintentos: {record.retryCount}</span>
                            <span>Fecha: {new Date(record.requestTimestamp).toLocaleString('es-VE')}</span>
                            <span>Usuario: {record.userName}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleRetryOperation(record.id)}
                              disabled={isRetrying === record.id}
                            >
                              {isRetrying === record.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Reintentar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="font-medium">No hay errores activos</h3>
                  <p>Todas las operaciones TFHKA se han ejecutado correctamente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análisis de Rendimiento
              </CardTitle>
              <CardDescription>
                Estadísticas y métricas de integración TFHKA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium">Tiempo Promedio de Respuesta</h4>
                  <div className="text-2xl font-bold">2.4s</div>
                  <p className="text-sm text-muted-foreground">
                    Últimos 30 días
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Operaciones por Día
                  </h4>
                  <div className="text-2xl font-bold">{formatNumber(23)}</div>
                  <p className="text-sm text-muted-foreground">
                    Promedio diario
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Disponibilidad TFHKA</h4>
                  <div className="text-2xl font-bold text-green-600">99.2%</div>
                  <p className="text-sm text-muted-foreground">
                    Uptime del servicio
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}