import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Download, FileText, Calendar as CalendarIcon, FileEdit, FileMinus, Eye } from 'lucide-react';
import { useInvoices } from '@/api/invoices';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Invoice } from '@/types';

export function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { data: invoices = [], isLoading } = useInvoices();

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.numero.toLowerCase().includes(search.toLowerCase()) ||
      invoice.receptor.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
      invoice.receptor.rif.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.estado === statusFilter;
    const matchesChannel = channelFilter === 'all' || invoice.canal === channelFilter;

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
    } catch (error) {
      toast.error('Error al generar PDF');
    }
  };

  const totalEmitidas = invoices.filter(inv => inv.estado === 'emitida').length;
  const totalNotas = invoices.filter(inv => inv.estado === 'nota_credito' || inv.estado === 'nota_debito').length;
  const totalVentasMes = invoices
    .filter(inv => inv.estado === 'emitida')
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
        <Button asChild className="w-full md:w-auto">
          <Link to="/facturas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Link>
        </Button>
      </div>

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
                <div className="text-xs sm:text-2xl font-bold leading-tight">{invoices.length}</div>
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
                <div className="text-xs sm:text-2xl font-bold leading-tight">{totalEmitidas}</div>
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
                <div className="text-xs sm:text-2xl font-bold leading-tight">{totalNotas}</div>
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
                <div className="text-xs sm:text-2xl font-bold leading-tight">{formatVES(totalVentasMes)}</div>
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
                <TableHead>Total (VES)</TableHead>
                <TableHead>Total (USD)</TableHead>
                <TableHead>Estado</TableHead>
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
                        invoice.canal === 'digital' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                      }>
                        {invoice.canal === 'digital' ? 'Digital' : 'Máquina'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatVES(invoice.total)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatUSD(invoice.totalUsdReferencia)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          invoice.estado === 'emitida' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                          invoice.estado === 'nota_credito' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        }
                      >
                        {invoice.estado === 'emitida' ? 'Emitida' :
                         invoice.estado === 'nota_credito' ? 'Nota Crédito' :
                         'Nota Débito'}
                      </Badge>
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
                        {invoice.estado === 'emitida' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Crear nota de crédito')}
                              title="Nota de Crédito"
                            >
                              <FileMinus className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Crear nota de débito')}
                              title="Nota de Débito"
                            >
                              <FileEdit className="h-4 w-4 text-slate-600" />
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
                      {formatVES(invoice.total)}
                    </div>
                    <div className="flex gap-1">
                      <Badge
                        variant={
                          invoice.status === 'active' ? 'default' :
                          invoice.status === 'voided' ? 'destructive' : 'secondary'
                        }
                        className="text-xs px-1 py-0"
                      >
                        {invoice.status === 'active' ? 'Act' :
                         invoice.status === 'voided' ? 'Anu' : 'Bor'}
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
    </div>
  );
}