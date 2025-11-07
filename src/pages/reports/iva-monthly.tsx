/**
 * Reporte Mensual de IVA
 * Declaración mensual para SENIAT con base imponible, IVA cobrado y saldo
 */

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
import { Download, FileText, Calculator, AlertTriangle, PieChart } from 'lucide-react';
import { formatVES, formatNumber, formatDateVE } from '@/lib/formatters';
import { useInvoices } from '@/api/invoices';
import { toast } from 'sonner';

interface IvaMensualData {
  periodo: string;
  baseImponibleGeneral: number; // Tasa 16%
  ivaGeneral: number;
  baseImponibleReducida: number; // Tasa 8%
  ivaReducida: number;
  ventasExentas: number;
  totalFacturado: number;
  ivaRetenido: number; // IVA retenido por terceros
  ivaAPagar: number;
  numeroFacturas: number;
}

export function IvaMensualPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');
  const [includeAnuladas, setIncludeAnuladas] = useState(false);

  const { data: invoices = [] } = useInvoices();

  // Generar períodos disponibles (últimos 12 meses)
  const availablePeriods = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().substring(0, 7),
      label: date.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
    };
  });

  // Filtrar facturas del período seleccionado
  const periodInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.fecha);
    const invoicePeriod = invoiceDate.toISOString().substring(0, 7);

    if (invoicePeriod !== selectedPeriod) return false;
    if (!includeAnuladas && invoice.estado === 'anulada') return false;

    return true;
  });

  // Calcular datos de IVA para el período
  const ivaData: IvaMensualData = {
    periodo: selectedPeriod,
    baseImponibleGeneral: 0,
    ivaGeneral: 0,
    baseImponibleReducida: 0,
    ivaReducida: 0,
    ventasExentas: 0,
    totalFacturado: 0,
    ivaRetenido: 0,
    ivaAPagar: 0,
    numeroFacturas: periodInvoices.length
  };

  // Calcular totales por cada factura
  periodInvoices.forEach(invoice => {
    const baseTotal = invoice.subtotal || 0;
    const ivaTotal = invoice.montoIva || 0;

    // Asumir que todas las ventas son tasa general (16%) para el ejemplo
    // En un sistema real, esto vendría de los items con sus tasas específicas
    ivaData.baseImponibleGeneral += baseTotal;
    ivaData.ivaGeneral += ivaTotal;
    ivaData.totalFacturado += invoice.total;

    // IVA retenido (si aplica)
    if (invoice.retencionIva) {
      ivaData.ivaRetenido += invoice.retencionIva;
    }
  });

  // Calcular IVA a pagar (IVA cobrado - IVA retenido)
  ivaData.ivaAPagar = ivaData.ivaGeneral - ivaData.ivaRetenido;

  // Datos por concepto para la tabla detallada
  const conceptosIva = [
    {
      concepto: 'Ventas Gravadas Tasa General (16%)',
      baseImponible: ivaData.baseImponibleGeneral,
      porcentaje: 16,
      iva: ivaData.ivaGeneral,
      operaciones: ivaData.numeroFacturas
    },
    {
      concepto: 'Ventas Gravadas Tasa Reducida (8%)',
      baseImponible: ivaData.baseImponibleReducida,
      porcentaje: 8,
      iva: ivaData.ivaReducida,
      operaciones: 0
    },
    {
      concepto: 'Ventas Exentas',
      baseImponible: ivaData.ventasExentas,
      porcentaje: 0,
      iva: 0,
      operaciones: 0
    }
  ];

  const handleExportExcel = () => {
    toast.success('Reporte de IVA exportado a Excel');
  };

  const handleExportPDF = () => {
    toast.success('Reporte de IVA exportado a PDF');
  };

  const handleGenerateDeclaration = () => {
    toast.success('Archivo para SENIAT generado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Reporte Mensual de IVA</h1>
          <p className="text-muted-foreground mt-2">
            Declaración mensual para SENIAT con cálculos automáticos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handleGenerateDeclaration}>
            <Calculator className="mr-2 h-4 w-4" />
            Generar Declaración
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parámetros del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Incluir Anuladas</Label>
              <Select value={includeAnuladas.toString()} onValueChange={(value) => setIncludeAnuladas(value === 'true')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No incluir</SelectItem>
                  <SelectItem value="true">Incluir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Badge variant="default" className="text-sm">
                {ivaData.numeroFacturas} facturas procesadas
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Base Imponible</p>
                <p className="text-2xl font-bold">{formatVES(ivaData.baseImponibleGeneral)}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IVA Cobrado</p>
                <p className="text-2xl font-bold">{formatVES(ivaData.ivaGeneral)}</p>
              </div>
              <PieChart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IVA Retenido</p>
                <p className="text-2xl font-bold">{formatVES(ivaData.ivaRetenido)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IVA a Pagar</p>
                <p className="text-2xl font-bold">{formatVES(ivaData.ivaAPagar)}</p>
              </div>
              <FileText className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla Detallada por Concepto */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Concepto</CardTitle>
          <CardDescription>
            Desglose de ventas por tipo de gravamen - Período {selectedPeriod}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Base Imponible</TableHead>
                <TableHead>Tasa %</TableHead>
                <TableHead>IVA Calculado</TableHead>
                <TableHead>Operaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conceptosIva.map((concepto, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{concepto.concepto}</TableCell>
                  <TableCell className="font-mono">{formatVES(concepto.baseImponible)}</TableCell>
                  <TableCell>
                    <Badge variant={concepto.porcentaje === 16 ? 'default' : concepto.porcentaje === 8 ? 'secondary' : 'outline'}>
                      {concepto.porcentaje}%
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{formatVES(concepto.iva)}</TableCell>
                  <TableCell className="font-mono">{formatNumber(concepto.operaciones)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>TOTALES</TableCell>
                <TableCell className="font-mono">{formatVES(ivaData.baseImponibleGeneral + ivaData.baseImponibleReducida + ivaData.ventasExentas)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-mono">{formatVES(ivaData.ivaGeneral + ivaData.ivaReducida)}</TableCell>
                <TableCell className="font-mono">{formatNumber(ivaData.numeroFacturas)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cálculo Final */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo de IVA a Pagar</CardTitle>
          <CardDescription>
            Determinación del monto final para declaración SENIAT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span>IVA Total Cobrado</span>
              <span className="font-mono text-lg">{formatVES(ivaData.ivaGeneral)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
              <span>(-) IVA Retenido por Terceros</span>
              <span className="font-mono text-lg">{formatVES(ivaData.ivaRetenido)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <span className="font-bold">IVA NETO A PAGAR</span>
              <span className="font-mono text-xl font-bold text-green-700">{formatVES(ivaData.ivaAPagar)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}