import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Download, FileText, Calendar } from 'lucide-react';
import { formatVES, formatNumber } from '@/lib/formatters';
import { toast } from 'sonner';
import type { SalesBookEntry } from '@/types';

// Mock data for sales book
const mockSalesBookData: SalesBookEntry[] = [
  {
    fecha: '2025-01-15',
    numeroFactura: 'FAC-001',
    cliente: 'Cliente Demo C.A.',
    baseImponible: 50000,
    montoIva: 8000,
    exento: 0,
    total: 58000,
    canal: 'digital',
  },
  {
    fecha: '2025-01-16',
    numeroFactura: 'FAC-002',
    cliente: 'Empresa ABC S.A.',
    baseImponible: 75000,
    montoIva: 12000,
    exento: 0,
    total: 87000,
    canal: 'digital',
  },
  {
    fecha: '2025-01-17',
    numeroFactura: 'MAQ-001',
    cliente: 'Comercial XYZ C.A.',
    baseImponible: 120000,
    montoIva: 19200,
    exento: 5000,
    total: 144200,
    canal: 'maquina',
  },
];

export function SalesBookPage() {
  const [period, setPeriod] = useState('2025-01');
  const [channel, setChannel] = useState('all');
  const [data] = useState<SalesBookEntry[]>(mockSalesBookData);

  const filteredData = data.filter(entry => {
    const entryMonth = entry.fecha.substring(0, 7);
    const matchesPeriod = entryMonth === period;
    const matchesChannel = channel === 'all' || entry.canal === channel;
    return matchesPeriod && matchesChannel;
  });

  // Calculate totals
  const totals = filteredData.reduce(
    (acc, entry) => ({
      baseImponible: acc.baseImponible + entry.baseImponible,
      montoIva: acc.montoIva + entry.montoIva,
      exento: acc.exento + entry.exento,
      total: acc.total + entry.total,
      documentos: acc.documentos + 1,
    }),
    { baseImponible: 0, montoIva: 0, exento: 0, total: 0, documentos: 0 }
  );

  const handleExportCSV = () => {
    const csvContent = [
      ['Fecha', 'Número Factura', 'Cliente', 'Base Imponible', 'IVA', 'Exento', 'Total', 'Canal'],
      ...filteredData.map(entry => [
        entry.fecha,
        entry.numeroFactura,
        entry.cliente,
        entry.baseImponible.toString(),
        entry.montoIva.toString(),
        entry.exento.toString(),
        entry.total.toString(),
        entry.canal,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `libro-ventas-${period}-${channel}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Libro de ventas exportado correctamente');
  };

  const handleExportPDF = () => {
    toast.success('Generando PDF del libro de ventas...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Libro de Ventas</h1>
          <p className="text-muted-foreground">
            Reporte fiscal mensual de ventas por canal
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="period">Período (YYYY-MM)</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="maquina">Máquina Fiscal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.documentos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Imponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totals.baseImponible)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totals.montoIva)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totals.exento)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totals.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Detalle del Libro de Ventas - {period}
          </CardTitle>
          <CardDescription>
            {channel === 'all' ? 'Todos los canales' : channel === 'digital' ? 'Canal Digital' : 'Máquina Fiscal'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>N° Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Base Imponible</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Exento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Canal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No hay datos para el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredData.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.fecha).toLocaleDateString('es-VE')}</TableCell>
                      <TableCell className="font-mono">{entry.numeroFactura}</TableCell>
                      <TableCell>{entry.cliente}</TableCell>
                      <TableCell className="font-mono text-right">
                        {formatNumber(entry.baseImponible)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {formatNumber(entry.montoIva)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {formatNumber(entry.exento)}
                      </TableCell>
                      <TableCell className="font-mono text-right font-medium">
                        {formatNumber(entry.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.canal === 'digital' ? 'default' : 'secondary'}>
                          {entry.canal === 'digital' ? 'Digital' : 'Máquina'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-primary font-bold">
                    <TableCell colSpan={3}>TOTALES</TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.baseImponible)}
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.montoIva)}
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.exento)}
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{totals.documentos} docs</Badge>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Información Legal
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Este reporte debe ser presentado mensualmente ante el SENIAT según las normativas fiscales vigentes. 
                Asegúrate de incluir todas las operaciones del período y verificar la correcta clasificación por canal 
                (digital vs máquina fiscal).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}