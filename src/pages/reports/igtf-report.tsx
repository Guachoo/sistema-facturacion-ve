import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { formatVES, formatNumber } from '@/lib/formatters';
import { toast } from 'sonner';
import type { IgtfReport } from '@/types';

// Mock data for IGTF report
const mockIgtfData: IgtfReport[] = [
  {
    periodo: '2025-01',
    formaPago: 'usd_cash',
    montoBase: 150000,
    montoIgtf: 4500,
    numeroOperaciones: 8,
  },
  {
    periodo: '2025-01',
    formaPago: 'zelle',
    montoBase: 280000,
    montoIgtf: 8400,
    numeroOperaciones: 15,
  },
];

const paymentTypeLabels: Record<string, string> = {
  usd_cash: 'USD Efectivo',
  zelle: 'Zelle',
  crypto: 'Criptomonedas',
  wire_transfer: 'Transferencia Internacional',
};

export function IgtfReportPage() {
  const [period, setPeriod] = useState('2025-01');
  const [data] = useState<IgtfReport[]>(mockIgtfData);

  const filteredData = data.filter(entry => entry.periodo === period);

  // Calculate totals
  const totals = filteredData.reduce(
    (acc, entry) => ({
      montoBase: acc.montoBase + entry.montoBase,
      montoIgtf: acc.montoIgtf + entry.montoIgtf,
      operaciones: acc.operaciones + entry.numeroOperaciones,
    }),
    { montoBase: 0, montoIgtf: 0, operaciones: 0 }
  );

  const handleExportCSV = () => {
    const csvContent = [
      ['Período', 'Forma de Pago', 'Monto Base (VES)', 'IGTF (VES)', 'N° Operaciones'],
      ...filteredData.map(entry => [
        entry.periodo,
        paymentTypeLabels[entry.formaPago] || entry.formaPago,
        entry.montoBase.toString(),
        entry.montoIgtf.toString(),
        entry.numeroOperaciones.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-igtf-${period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Reporte IGTF exportado correctamente');
  };

  const handleExportPDF = () => {
    toast.success('Generando PDF del reporte IGTF...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporte IGTF</h1>
          <p className="text-muted-foreground">
            Impuesto a las Grandes Transacciones Financieras
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.operaciones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totals.montoBase)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IGTF Total</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatVES(totals.montoIgtf)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,00%</div>
          </CardContent>
        </Card>
      </div>

      {/* IGTF Information */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-orange-800 dark:text-orange-200">
                Información sobre el IGTF
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                El Impuesto a las Grandes Transacciones Financieras (IGTF) aplica una tasa del 3% sobre 
                las operaciones en divisas realizadas fuera del sistema financiero nacional. Esto incluye:
              </p>
              <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc list-inside space-y-1">
                <li>Pagos en efectivo en moneda extranjera</li>
                <li>Transferencias internacionales (Zelle, PayPal, etc.)</li>
                <li>Transacciones con criptomonedas</li>
                <li>Otros medios de pago en divisas no bancarios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Detalle del Reporte IGTF - {period}
          </CardTitle>
          <CardDescription>
            Desglose por forma de pago que genera IGTF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>N° Operaciones</TableHead>
                <TableHead>Monto Base (VES)</TableHead>
                <TableHead>Tasa IGTF</TableHead>
                <TableHead>IGTF Generado (VES)</TableHead>
                <TableHead>% del Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No hay operaciones con IGTF para el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredData.map((entry, index) => {
                    const percentage = totals.montoIgtf > 0 ? (entry.montoIgtf / totals.montoIgtf) * 100 : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {paymentTypeLabels[entry.formaPago] || entry.formaPago}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-center">
                          {entry.numeroOperaciones}
                        </TableCell>
                        <TableCell className="font-mono text-right">
                          {formatNumber(entry.montoBase)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">3,00%</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-right font-medium">
                          {formatNumber(entry.montoIgtf)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(percentage, 1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-primary font-bold">
                    <TableCell>TOTALES</TableCell>
                    <TableCell className="font-mono text-center">
                      {totals.operaciones}
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.montoBase)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge>3,00%</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNumber(totals.montoIgtf)}
                    </TableCell>
                    <TableCell className="text-right">100,0%</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Obligaciones Fiscales
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                El IGTF debe ser declarado y pagado mensualmente ante el SENIAT. Es responsabilidad del 
                contribuyente calcular correctamente el impuesto y realizar el pago dentro de los plazos 
                establecidos. La omisión o declaración incorrecta puede generar sanciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}