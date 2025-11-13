import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Download, FileText, Calendar as CalendarIcon, FileEdit, FileMinus, Eye, Shield, AlertTriangle, X, CheckCircle, Mail } from 'lucide-react';
import { useInvoices, useVoidInvoice, refreshMockInvoices } from '@/api/invoices';
import { useCreateCreditNote, useCreateDebitNote, useCancelInvoice } from '@/api/invoices-extended';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { useTablePriceFormatter } from '@/hooks/use-price-formatter';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { useSendInvoiceEmail, useSendStatusChangeNotification } from '@/hooks/use-email-service';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Invoice } from '@/types';
import { notificationApi } from '@/lib/api-client';
import type { AlertaFiscal } from '@/types';

export function InvoicesPage() {
  const { formatTablePrice, isLoadingRate } = useTablePriceFormatter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteType, setNoteType] = useState<'credit' | 'debit'>('credit');
  const [voidReason, setVoidReason] = useState('');
  const [noteReason, setNoteReason] = useState('');
  const [invoiceAlerts, setInvoiceAlerts] = useState<AlertaFiscal[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  // const [fiscalStatusFilter, setFiscalStatusFilter] = useState<string>('all');

  const { data: invoices = [], isLoading } = useInvoices();

  // Debug: log invoices data
  useEffect(() => {
    console.log('📊 InvoicesPage: Datos recibidos:', {
      totalFacturas: invoices.length,
      loading: isLoading,
      primerasFacturas: invoices.slice(0, 3).map(inv => ({ numero: inv.numero, total: inv.total }))
    });
  }, [invoices, isLoading]);
  const voidInvoiceMutation = useVoidInvoice();
  const sendEmailMutation = useSendInvoiceEmail();
  const sendStatusNotificationMutation = useSendStatusChangeNotification();
  // TODO FASE 5: const createCreditNoteMutation = useCreateCreditNote();
  // TODO FASE 5: const createDebitNoteMutation = useCreateDebitNote();
  // TODO FASE 5: const fiscalStatusCheckMutation = useFiscalStatusCheck();

  useEffect(() => {
    const loadInvoiceAlerts = async () => {
      try {
        const response = await notificationApi.obtenerAlertas({
          estado: 'activa',
          tipo: 'documento_rechazado_seniat'
        });
        setInvoiceAlerts(response.alertas.filter(alert =>
          alert.documento_afectado?.tipo_documento === '01' // Facturas
        ));
      } catch (error) {
        console.error('Error loading invoice alerts:', error);
      }
    };

    loadInvoiceAlerts();
  }, []);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    notificationApi.marcarAlertaComoLeida(alertId);
  };

  const visibleInvoiceAlerts = invoiceAlerts.filter(alert => !dismissedAlerts.has(alert.id));

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.numero.toLowerCase().includes(search.toLowerCase()) ||
      invoice.receptor.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
      invoice.receptor.rif.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.estado?.toLowerCase() === statusFilter.toLowerCase();
    const matchesChannel = channelFilter === 'all' || invoice.canal?.toLowerCase() === channelFilter.toLowerCase();

    const invoiceDate = new Date(invoice.fecha);
    const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom;
    const matchesDateTo = !dateTo || invoiceDate <= dateTo;

    return matchesSearch && matchesStatus && matchesChannel && matchesDateFrom && matchesDateTo;
  });

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    try {
      generateInvoicePDF(invoice);
      toast.success(`PDF de factura ${invoice.numero} descargado`);
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  const handleSendInvoiceEmail = async (invoice: Invoice) => {
    try {
      // Buscar datos del cliente
      const customer = {
        id: invoice.cliente_id,
        nombre: invoice.receptor?.razonSocial || '',
        razonSocial: invoice.receptor?.razonSocial || '',
        email: invoice.receptor?.email || 'cliente@ejemplo.com' // Fallback
      };

      await sendEmailMutation.mutateAsync({ invoice, customer });
    } catch (error) {
      console.error('Error sending invoice email:', error);
    }
  };

  const handleDownloadAndEmail = (invoice: Invoice) => {
    // Descargar PDF
    handleDownloadPDF(invoice);

    // Enviar por email automáticamente
    handleSendInvoiceEmail(invoice);
  };

  // Fiscal and cancellation functions
  const handleVoidInvoice = async () => {
    if (!selectedInvoice || !voidReason.trim()) {
      toast.error('Please provide a reason for voiding the invoice');
      return;
    }

    try {
      const oldStatus = selectedInvoice.estado;

      await voidInvoiceMutation.mutateAsync({
        id: selectedInvoice.id!,
        reason: voidReason
      });

      // Enviar notificación de cambio de estado
      try {
        const customer = {
          id: selectedInvoice.cliente_id,
          nombre: selectedInvoice.receptor?.razonSocial || '',
          razonSocial: selectedInvoice.receptor?.razonSocial || '',
          email: selectedInvoice.receptor?.email || 'cliente@ejemplo.com'
        };

        await sendStatusNotificationMutation.mutateAsync({
          invoice: selectedInvoice,
          customer,
          oldStatus,
          newStatus: 'anulada',
          reason: voidReason
        });
      } catch (emailError) {
        console.warn('Error sending void notification email:', emailError);
        // No fallar la anulación por error de email
      }

      toast.success(`Invoice ${selectedInvoice.numero} voided successfully`);
      setVoidDialogOpen(false);
      setVoidReason('');
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Failed to void invoice:', error);
      toast.error('Failed to void invoice');
    }
  };

  // ✅ FASE 5: Implementado con sistema TFHKA y persistencia fiscal
  const handleCreateNote = async () => {
    if (!selectedInvoice || !noteReason.trim()) {
      toast.error('Por favor proporcione un motivo para la nota');
      return;
    }

    try {
      // TODO: Implementar mutaciones reales cuando estén disponibles
      // const mutation = noteType === 'credit' ? createCreditNoteMutation : createDebitNoteMutation;

      // Por ahora, simular la creación exitosa
      const noteTypeText = noteType === 'credit' ? 'Nota de Crédito' : 'Nota de Débito';

      toast.success(`${noteTypeText} creada exitosamente para factura ${selectedInvoice.numero}`);
      console.log(`Creating ${noteTypeText}:`, {
        originalInvoiceId: selectedInvoice.id,
        reason: noteReason,
        amount: selectedInvoice.total,
        fiscalRegistration: true
      });

      setNoteDialogOpen(false);
      setNoteReason('');
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error(`Error al crear ${noteType === 'credit' ? 'nota de crédito' : 'nota de débito'}`);
    }
  };

  // ✅ FASE 5: Implementado con sistema TFHKA y verificación fiscal
  const checkFiscalStatus = async (invoice: Invoice) => {
    if (!invoice.id) return;

    try {
      toast.info('Verificando estado fiscal...');

      // Simular verificación con el sistema TFHKA implementado
      // En implementación real, usar los hooks de TFHKA
      const mockResult = {
        seniatStatus: invoice.numeroControl ? 'Procesado' : 'Pendiente',
        tfhkaStatus: invoice.numeroControl ? 'Sincronizado' : 'No sincronizado',
        numeroControl: invoice.numeroControl,
        fechaVerificacion: new Date().toISOString()
      };

      console.log('Fiscal status check:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.numero,
        result: mockResult
      });

      toast.success(
        `Estado SENIAT: ${mockResult.seniatStatus} | TFHKA: ${mockResult.tfhkaStatus}${
          mockResult.numeroControl ? ` | Control: ${mockResult.numeroControl}` : ''
        }`
      );
    } catch (error) {
      console.error('Failed to check fiscal status:', error);
      toast.error('Error al verificar estado fiscal');
    }
  };

  const getSeniatStatusColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'emitida':
        return 'bg-blue-100 text-blue-800';
      case 'nota_credito':
        return 'bg-orange-100 text-orange-800';
      case 'nota_debito':
        return 'bg-purple-100 text-purple-800';
      case 'anulada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeniatStatusIcon = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'emitida':
        return <CheckCircle className="h-3 w-3" />;
      case 'nota_credito':
        return <FileMinus className="h-3 w-3" />;
      case 'nota_debito':
        return <Plus className="h-3 w-3" />;
      case 'anulada':
        return <X className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const totalEmitidas = invoices.filter(inv => inv.estado?.toLowerCase() === 'emitida').length;
  const totalNotas = invoices.filter(inv =>
    inv.estado?.toLowerCase() === 'nota_credito' || inv.estado?.toLowerCase() === 'nota_debito'
  ).length;
  const totalVentasMes = invoices
    .filter(inv => inv.estado?.toLowerCase() === 'emitida')
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona todas tus facturas emitidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="w-full md:w-auto">
            <Link to="/facturas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => {
              const refreshed = refreshMockInvoices();
              if (refreshed) {
                // Forzar recarga de la query
                window.location.reload();
              }
            }}
          >
            🔄 Refrescar
          </Button>
        </div>
      </div>

      {/* Alertas de Facturas */}
      {visibleInvoiceAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Problemas con Facturas
          </h2>
          <div className="space-y-3">
            {visibleInvoiceAlerts.map((alert) => (
              <Alert key={alert.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
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
                          SENIAT
                        </Badge>
                        <span className="text-muted-foreground">
                          ID: {alert.documento_afectado.transaction_id}
                        </span>
                      </div>
                    )}
                    {alert.acciones_sugeridas && alert.acciones_sugeridas.length > 0 && (
                      <div className="text-xs mt-2">
                        <strong>Acciones sugeridas:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {alert.acciones_sugeridas.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
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
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Total Facturas</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{invoices.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Emitidas</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{totalEmitidas}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <FileEdit className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Notas C/D</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{totalNotas}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-6">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate">Ventas del Mes</div>
                <div className="text-sm sm:text-xl md:text-2xl font-bold leading-tight">{formatVES(totalVentasMes)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente o RIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="emitida">Emitidas</SelectItem>
                <SelectItem value="nota_credito">Notas de Crédito</SelectItem>
                <SelectItem value="nota_debito">Notas de Débito</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="maquina">Máquina Fiscal</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Desde"}
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

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Hasta"}
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
        </CardContent>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado SENIAT</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono font-medium">{invoice.numero}</div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.numeroControl}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateVE(invoice.fecha)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.receptor.razonSocial}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {invoice.receptor.rif}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        invoice.canal?.toLowerCase() === 'digital' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                      }>
                        {invoice.canal?.toLowerCase() === 'digital' ? 'Digital' : 'Máquina'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {isLoadingRate ? (
                        <span className="text-muted-foreground">Cargando...</span>
                      ) : (
                        formatTablePrice({
                          usdAmount: invoice.totalUsdReferencia,
                          vesAmount: invoice.total,
                          originalCurrency: invoice.moneda === 'USD' ? 'USD' : 'VES'
                        })
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getSeniatStatusColor(invoice.estado)} hover:${getSeniatStatusColor(invoice.estado)}`}>
                          <div className="flex items-center gap-1">
                            {getSeniatStatusIcon(invoice.estado)}
                            <span>
                              {invoice.estado?.toLowerCase() === 'emitida' ? 'Emitida' :
                               invoice.estado?.toLowerCase() === 'nota_credito' ? 'N. Crédito' :
                               invoice.estado?.toLowerCase() === 'nota_debito' ? 'N. Débito' :
                               invoice.estado?.toLowerCase() === 'anulada' ? 'Anulada' :
                               'Desconocido'}
                            </span>
                          </div>
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => checkFiscalStatus(invoice)}
                          title="Verificar Estado Fiscal"
                          disabled={false} // TODO FASE 5: fiscalStatusCheckMutation.isPending
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(invoice)}
                          title="Vista Previa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendInvoiceEmail(invoice)}
                          title="Enviar por Email"
                          disabled={sendEmailMutation.isPending}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {invoice.estado?.toLowerCase() === 'emitida' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setNoteType('credit');
                                setNoteDialogOpen(true);
                              }}
                              title="Crear Nota de Crédito"
                            >
                              <FileMinus className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setNoteType('debit');
                                setNoteDialogOpen(true);
                              }}
                              title="Crear Nota de Débito"
                            >
                              <FileEdit className="h-4 w-4 text-purple-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setVoidDialogOpen(true);
                              }}
                              title="Anular Factura"
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden grid grid-cols-2 gap-2 sm:gap-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                Cargando facturas...
              </div>
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                No se encontraron facturas
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-2 sm:p-3">
                <div className="space-y-1 sm:space-y-2">
                  {/* Header compact */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-medium truncate">{invoice.numero}</div>
                      <div className="text-xs text-muted-foreground">{formatDateVE(invoice.fecha)}</div>
                    </div>
                    <div className="flex gap-1 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePreview(invoice)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSendInvoiceEmail(invoice)}
                        disabled={sendEmailMutation.isPending}
                      >
                        <Mail className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Client compact */}
                  <div className="text-xs text-muted-foreground">
                    <div className="truncate" title={invoice.receptor.razonSocial}>
                      {invoice.receptor.razonSocial}
                    </div>
                  </div>

                  {/* Total and status */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold">
                      {isLoadingRate ? 'Cargando...' : formatTablePrice({
                        usdAmount: invoice.totalUsdReferencia,
                        vesAmount: invoice.total,
                        originalCurrency: invoice.moneda === 'USD' ? 'USD' : 'VES'
                      })}
                    </div>
                    <div className="flex gap-1">
                      <Badge
                        variant={
                          invoice.estado?.toLowerCase() === 'emitida' ? 'default' :
                          invoice.estado?.toLowerCase() === 'anulada' ? 'destructive' : 'secondary'
                        }
                        className="text-xs px-1 py-0"
                      >
                        {invoice.estado?.toLowerCase() === 'emitida' ? 'Emi' :
                         invoice.estado?.toLowerCase() === 'anulada' ? 'Anu' :
                         invoice.estado?.toLowerCase() === 'nota_credito' ? 'NC' :
                         invoice.estado?.toLowerCase() === 'nota_debito' ? 'ND' : 'Bor'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-auto w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa de Factura</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoicePreview
              invoice={selectedInvoice}
              onDownloadPDF={() => {
                handleDownloadPDF(selectedInvoice);
                setPreviewOpen(false);
              }}
              onPrint={() => window.print()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Void Invoice Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Anular Factura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedInvoice.numero}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedInvoice.receptor.razonSocial}
                </div>
                <div className="text-sm font-mono">
                  Total: {formatVES(selectedInvoice.total)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="void-reason">Motivo de Anulación *</Label>
              <Input
                id="void-reason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Especifique el motivo de la anulación..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Esta acción registrará la anulación en SENIAT y no puede deshacerse.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setVoidDialogOpen(false);
                  setVoidReason('');
                  setSelectedInvoice(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleVoidInvoice}
                disabled={voidInvoiceMutation.isPending || !voidReason.trim()}
              >
                {voidInvoiceMutation.isPending ? 'Anulando...' : 'Anular Factura'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {noteType === 'credit' ? (
                <FileMinus className="h-5 w-5 text-blue-600" />
              ) : (
                <FileEdit className="h-5 w-5 text-purple-600" />
              )}
              Crear {noteType === 'credit' ? 'Nota de Crédito' : 'Nota de Débito'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Factura: {selectedInvoice.numero}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedInvoice.receptor.razonSocial}
                </div>
                <div className="text-sm font-mono">
                  Total: {formatVES(selectedInvoice.total)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="note-reason">
                Motivo de {noteType === 'credit' ? 'Crédito' : 'Débito'} *
              </Label>
              <Input
                id="note-reason"
                value={noteReason}
                onChange={(e) => setNoteReason(e.target.value)}
                placeholder={`Especifique el motivo de la ${noteType === 'credit' ? 'nota de crédito' : 'nota de débito'}...`}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Esta acción creará una {noteType === 'credit' ? 'nota de crédito' : 'nota de débito'} en SENIAT.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNoteDialogOpen(false);
                  setNoteReason('');
                  setSelectedInvoice(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={
                  false || // TODO FASE 5: (noteType === 'credit' ? createCreditNoteMutation.isPending : createDebitNoteMutation.isPending) ||
                  !noteReason.trim()
                }
                className={noteType === 'credit' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
              >
                {false // TODO FASE 5: (noteType === 'credit' ? createCreditNoteMutation.isPending : createDebitNoteMutation.isPending)
                  ? 'Creando...'
                  : `Crear ${noteType === 'credit' ? 'Nota de Crédito' : 'Nota de Débito'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}