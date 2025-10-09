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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emitidas</CardTitle>
            <FileText className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totalEmitidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas C/D</CardTitle>
            <FileEdit className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalNotas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totalVentasMes)}</div>
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

      {/* Table */}
      <Card>
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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