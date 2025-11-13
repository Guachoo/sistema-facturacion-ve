import { Card, CardContent } from '@/components/ui/card';
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
          {/* Official Header */}
          <div className="invoice-header">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  {invoice.estado?.toLowerCase() === 'nota_credito' ? 'Nota de Crédito' :
                   invoice.estado?.toLowerCase() === 'nota_debito' ? 'Nota de Débito' :
                   'Factura'}
                </h1>
              </div>
              <div className="text-right space-y-1">
                <div className="text-lg font-bold">N° Documento {invoice.numeroDocumento || invoice.numero}</div>
                <div className="text-sm font-medium">N° Control: {invoice.numeroControl}</div>
                <div className="text-sm">Fecha de Emisión: {formatDateVE(invoice.fecha)}</div>
                <div className="text-sm">Hora de Emisión: {invoice.horaEmision || new Date().toLocaleTimeString('es-VE')}</div>
              </div>
            </div>

            {/* Emisor y Receptor */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-lg mb-3 text-primary">Emisor</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Nombre o Razón Social:</span> {invoice.emisor.nombre}</p>
                  <p><span className="font-semibold">Domicilio Fiscal:</span> {invoice.emisor.domicilio}</p>
                  <p><span className="font-semibold">RIF:</span> {invoice.emisor.rif}</p>
                  <p><span className="font-semibold">Correo(s):</span> {invoice.emisor.correo || 'empresa@miempresa.com'}</p>
                  <p><span className="font-semibold">Teléfono:</span> {invoice.emisor.telefono || '0212-555-0000'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3 text-primary">Receptor</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Nombre o Razón Social:</span> {invoice.receptor.razonSocial}</p>
                  <p><span className="font-semibold">Domicilio Fiscal:</span> {invoice.receptor.domicilio}</p>
                  <p><span className="font-semibold">N° Identificación:</span> {invoice.receptor.rif}</p>
                  <p><span className="font-semibold">Correo(s):</span> {invoice.receptor.correo || 'cliente@empresa.com'}</p>
                  <p><span className="font-semibold">Teléfono(s):</span> {invoice.receptor.telefono || '+58-XXX-XXXXXXX'}</p>
                </div>
              </div>
            </div>

            {/* Vendedor */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3 text-primary">Vendedor</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="font-semibold">Código:</span> {invoice.vendedor?.codigo || '001'}</div>
                <div><span className="font-semibold">Nombre:</span> {invoice.vendedor?.nombre || 'Vendedor General'}</div>
                <div><span className="font-semibold">Num. Cajero:</span> {invoice.vendedor?.cajero || '1'}</div>
              </div>
            </div>
          </div>

          {/* Items Table - Official Structure */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-400">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-400 text-left p-2 text-sm font-bold">Descripción</th>
                  <th className="border border-gray-400 text-center p-2 text-sm font-bold">Cantidad</th>
                  <th className="border border-gray-400 text-center p-2 text-sm font-bold">Código</th>
                  <th className="border border-gray-400 text-right p-2 text-sm font-bold">Valor<br/>Unitario</th>
                  <th className="border border-gray-400 text-right p-2 text-sm font-bold">Valor<br/>Total Item</th>
                  <th className="border border-gray-400 text-center p-2 text-sm font-bold">Tipo<br/>Impuesto</th>
                  <th className="border border-gray-400 text-right p-2 text-sm font-bold">Valor<br/>Impuesto</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineas.map((line, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 p-2 text-sm">{line.descripcion}</td>
                    <td className="border border-gray-400 p-2 text-center text-sm">{formatNumber(line.cantidad, 2)}</td>
                    <td className="border border-gray-400 p-2 text-center font-mono text-sm">{line.codigo}</td>
                    <td className="border border-gray-400 p-2 text-right font-mono text-sm">{formatNumber(line.precioUnitario)}</td>
                    <td className="border border-gray-400 p-2 text-right font-mono text-sm">{formatNumber(line.baseImponible)}</td>
                    <td className="border border-gray-400 p-2 text-center text-sm font-bold">G</td>
                    <td className="border border-gray-400 p-2 text-right font-mono text-sm">{formatNumber(line.montoIva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Methods - Official Structure */}
          {invoice.pagos.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-3 text-primary">Forma(s) de Pago</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <table className="w-full border-collapse border border-gray-400">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-400 text-left p-2 text-sm font-bold">Forma(s) de Pago</th>
                        <th className="border border-gray-400 text-right p-2 text-sm font-bold">Monto</th>
                        <th className="border border-gray-400 text-center p-2 text-sm font-bold">Moneda</th>
                        <th className="border border-gray-400 text-center p-2 text-sm font-bold">Tipo de Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.pagos.map((pago, index) => (
                        <tr key={index}>
                          <td className="border border-gray-400 p-2 text-sm">
                            {pago.tipoPago === 'TRANSFERENCIA' && 'Transferencia Bancaria'}
                            {pago.tipoPago === 'TARJETA_CREDITO' && 'Tarjeta de Crédito'}
                            {pago.tipoPago === 'EFECTIVO' && 'Efectivo'}
                            {pago.tipoPago === 'PAYPAL' && 'PayPal'}
                            {pago.tipoPago === 'ZELLE' && 'Zelle'}
                          </td>
                          <td className="border border-gray-400 p-2 text-right font-mono text-sm">
                            {invoice.moneda === 'USD' ? formatUSD(pago.monto) : formatVES(pago.monto)}
                          </td>
                          <td className="border border-gray-400 p-2 text-center text-sm font-bold">{invoice.moneda}</td>
                          <td className="border border-gray-400 p-2 text-center font-mono text-sm">{formatNumber(invoice.tasaBcv)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-bold">Total Base Imponible G (16%)</span>
                      <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.baseImponible) : formatVES(invoice.baseImponible)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Total Impuesto G (16%)</span>
                      <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.montoIva) : formatVES(invoice.montoIva)}</span>
                    </div>
                    {invoice.exento > 0 && (
                      <div className="flex justify-between">
                        <span className="font-bold">Exento</span>
                        <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.exento || 0) : formatVES(invoice.exento || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-bold">Subtotal</span>
                      <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.subtotal) : formatVES(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Subtotal Impuesto</span>
                      <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.montoIva) : formatVES(invoice.montoIva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total A Pagar</span>
                      <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.total) : formatVES(invoice.total)}</span>
                    </div>

                    {/* IGTF section for Credit/Debit Notes */}
                    {(invoice.estado?.toLowerCase() === 'nota_credito' || invoice.estado?.toLowerCase() === 'nota_debito') && (
                      <>
                        <div className="flex justify-between mt-4 pt-2 border-t">
                          <span className="font-bold">Base Imponible IGTF</span>
                          <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.baseImponibleIgtf || invoice.total - (invoice.montoIgtf || 0)) : formatVES(invoice.baseImponibleIgtf || invoice.total - (invoice.montoIgtf || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">Total IGTF</span>
                          <span className="font-mono">{invoice.moneda === 'USD' ? formatUSD(invoice.montoIgtf || 0) : formatVES(invoice.montoIgtf || 0)}</span>
                        </div>
                      </>
                    )}

                    {invoice.moneda === 'USD' && (
                      <>
                        <div className="flex justify-between mt-4">
                          <span className="font-bold">Pago en Divisas</span>
                          <span className="font-mono">{formatUSD(invoice.total)}</span>
                        </div>
                        {invoice.montoIgtf > 0 && (
                          <div className="flex justify-between">
                            <span className="font-bold">Impuesto (IGTF) AL 3,00% SOBRE {formatVES(invoice.total * invoice.tasaBcv)}:</span>
                            <span className="font-mono">{formatUSD(invoice.montoIgtf)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold">
                          <span>Total a Pagar en Bs. después de IGTF:</span>
                          <span className="font-mono">{formatVES(invoice.total * invoice.tasaBcv + (invoice.montoIgtf * invoice.tasaBcv))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aplica a Factura - Solo para Notas de Crédito/Débito */}
          {(invoice.estado?.toLowerCase() === 'nota_credito' || invoice.estado?.toLowerCase() === 'nota_debito') && (
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-3 text-primary">Aplica a Factura</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <table className="w-full border-collapse border border-gray-400">
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 p-2 text-sm font-semibold bg-gray-100">Serie</td>
                        <td className="border border-gray-400 p-2 text-sm">{invoice.facturaAfectadaNumero?.split('-')[0] || 'D'}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 text-sm font-semibold bg-gray-100">Número</td>
                        <td className="border border-gray-400 p-2 text-sm">{invoice.facturaAfectadaNumero?.split('-')[1]?.replace(/[A-Z]/g, '') || '2'}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 text-sm font-semibold bg-gray-100">Fecha</td>
                        <td className="border border-gray-400 p-2 text-sm">{invoice.facturaAfectadaFecha ? formatDateVE(invoice.facturaAfectadaFecha) : '05/12/2022'}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 text-sm font-semibold bg-gray-100">Monto</td>
                        <td className="border border-gray-400 p-2 text-sm font-mono">{invoice.facturaAfectadaMonto ? formatNumber(invoice.facturaAfectadaMonto) : '300.81'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="border border-gray-400 p-3">
                    <div className="font-semibold text-sm mb-2">Comentarios</div>
                    <div className="text-sm">{invoice.motivoNota || 'Comentario para la factura'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información Adicional */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-3 text-primary">Información Adicional</h3>
            <div className="grid grid-cols-1 gap-4">
              {invoice.informacionAdicional?.adicional1 && (
                <div className="border border-gray-300 p-3">
                  <div className="font-semibold text-sm mb-1">Adicional1</div>
                  <div className="text-xs">{invoice.informacionAdicional.adicional1}</div>
                </div>
              )}
              {invoice.informacionAdicional?.adicional2 && (
                <div className="border border-gray-300 p-3">
                  <div className="font-semibold text-sm mb-1">Adicional2</div>
                  <div className="text-xs">{invoice.informacionAdicional.adicional2}</div>
                </div>
              )}
              {invoice.informacionAdicional?.adicional3 && (
                <div className="border border-gray-300 p-3">
                  <div className="font-semibold text-sm mb-1">Adicional3</div>
                  <div className="text-xs">{invoice.informacionAdicional.adicional3}</div>
                </div>
              )}
              {invoice.informacionAdicional?.adicional4 && (
                <div className="border border-gray-300 p-3">
                  <div className="font-semibold text-sm mb-1">Adicional4</div>
                  <div className="text-xs">{invoice.informacionAdicional.adicional4}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Fiscal Oficial */}
          <div className="mt-8 pt-4 border-t-2 border-black">
            <div className="text-center mb-4">
              <div className="font-bold text-sm uppercase">
                DOCUMENTO EMITIDO CONFORME A LA PROVIDENCIA ADMINISTRATIVA SNAT/2014/0032
              </div>
            </div>

            <div className="text-center text-xs space-y-1">
              <div className="font-bold">
                {invoice.emisor.nombre}, {invoice.emisor.rif}, {invoice.emisor.domicilio}
              </div>
              <div>
                {invoice.emisor.telefono || '0212-555-0000'} | {invoice.emisor.correo || 'contacto@miempresa.com'}
              </div>
              <div className="mt-2">
                <strong>Imprenta Digital Autorizada</strong> mediante Providencia SENIAT/INTI/2024-001 de fecha {formatDateVE(new Date())}
              </div>
              <div>
                Nros de Control desde el 00-00000001 hasta 00-00100000 generados digitalmente en fecha {formatDateVE(new Date())} {new Date().toLocaleTimeString('es-VE')}
              </div>
            </div>

            {invoice.estado === 'ANULADA' && (
              <div className="text-center mt-4">
                <Badge variant="destructive" className="text-lg px-6 py-3">
                  FACTURA ANULADA
                </Badge>
              </div>
            )}

            <div className="text-center mt-4 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                Canal: {invoice.canal === 'Digital' ? 'Digital' : 'Máquina Fiscal'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}