import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Link as LinkIcon, Printer } from 'lucide-react';
import { formatVES, formatUSD, formatDateVE, formatNumber } from '@/lib/formatters';
import type { Invoice } from '@/types';

interface InvoicePreviewProps {
  invoice: Invoice;
  onDownloadPDF?: () => void;
  onGenerateLink?: () => void;
  onPrint?: () => void;
}

export function InvoicePreview({ 
  invoice, 
  onDownloadPDF, 
  onGenerateLink, 
  onPrint 
}: InvoicePreviewProps) {
  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2 no-print">
        <Button onClick={onDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
        <Button onClick={onGenerateLink} variant="outline">
          <LinkIcon className="mr-2 h-4 w-4" />
          Generar Enlace
        </Button>
        <Button onClick={onPrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Invoice Document */}
      <Card className="invoice-layout">
        <CardContent className="p-8">
          {/* Header */}
          <div className="invoice-header">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-primary">FACTURA</h1>
                <p className="text-sm text-muted-foreground">Documento generado por medios digitales</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">N° {invoice.numero}</div>
                <div className="text-sm text-muted-foreground">Control: {invoice.numeroControl}</div>
                <div className="text-sm text-muted-foreground">Fecha: {formatDateVE(invoice.fecha)}</div>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="invoice-details">
              <div>
                <h3 className="font-semibold mb-2">EMISOR</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{invoice.emisor.nombre}</p>
                  <p>RIF: {invoice.emisor.rif}</p>
                  <p>{invoice.emisor.domicilio}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">RECEPTOR</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{invoice.receptor.razonSocial}</p>
                  <p>RIF: {invoice.receptor.rif}</p>
                  <p>{invoice.receptor.domicilio}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {invoice.receptor.tipoContribuyente === 'especial' && 'Contribuyente Especial'}
                      {invoice.receptor.tipoContribuyente === 'ordinario' && 'Contribuyente Ordinario'}
                      {invoice.receptor.tipoContribuyente === 'formal' && 'Contribuyente Formal'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th className="text-left">Código</th>
                  <th className="text-left">Descripción</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-right">Precio Unit.</th>
                  <th className="text-right">Desc. %</th>
                  <th className="text-right">Base Imponible</th>
                  <th className="text-right">IVA</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineas.map((line, index) => (
                  <tr key={index}>
                    <td className="font-mono text-sm">{line.codigo}</td>
                    <td>{line.descripcion}</td>
                    <td className="text-center">{formatNumber(line.cantidad, 0)}</td>
                    <td className="text-right font-mono">{formatNumber(line.precioUnitario)}</td>
                    <td className="text-center">{formatNumber(line.descuento, 1)}%</td>
                    <td className="text-right font-mono">{formatNumber(line.baseImponible)}</td>
                    <td className="text-right font-mono">{formatNumber(line.montoIva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Methods */}
          {invoice.pagos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">FORMAS DE PAGO</h3>
              <div className="space-y-2">
                {invoice.pagos.map((pago, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>
                      {pago.tipo === 'transferencia_ves' && 'Transferencia VES'}
                      {pago.tipo === 'usd_cash' && 'USD Efectivo'}
                      {pago.tipo === 'zelle' && 'Zelle'}
                      {pago.tipo === 'mixto' && 'Mixto'}
                      {pago.montoUsd && ` (${formatUSD(pago.montoUsd)} ref.)`}
                    </span>
                    <span className="font-mono">{formatVES(pago.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="invoice-totals">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatVES(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span className="font-mono">{formatVES(invoice.montoIva)}</span>
                </div>
                {invoice.montoIgtf > 0 && (
                  <div className="flex justify-between">
                    <span>IGTF (3%):</span>
                    <span className="font-mono">{formatVES(invoice.montoIgtf)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL VES:</span>
                  <span className="font-mono">{formatVES(invoice.total)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Equivalencia al tipo de cambio BCV del día:</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 USD = {formatNumber(invoice.tasaBcv)} VES ({invoice.fechaTasaBcv})</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total referencial en USD:</span>
                    <span className="font-mono">{formatUSD(invoice.totalUsdReferencia)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Documento generado por medios digitales.</strong> La equivalencia en divisas es referencial. 
              Total exigible en VES.
            </p>
            <p>
              Canal: <Badge variant="outline" className="text-xs">
                {invoice.canal === 'digital' ? 'Digital' : 'Máquina Fiscal'}
              </Badge>
            </p>
            {invoice.estado === 'anulada' && (
              <div className="text-center">
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  FACTURA ANULADA
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}