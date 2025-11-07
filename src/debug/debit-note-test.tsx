import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FiscalTemplateGenerator } from '@/services/fiscal-template-generator';
import { FiscalDocumentValidator } from '@/lib/fiscal-validator';
import type { Invoice, Customer } from '@/types';

export function DebitNoteTest() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testDebitNoteGeneration = async () => {
    setIsLoading(true);
    try {
      const generator = new FiscalTemplateGenerator();
      const validator = new FiscalDocumentValidator();

      // Datos de test similares al JSON que proporcionaste
      const testCustomer: Customer = {
        id: 'cust-1',
        rif: 'V-26159207',
        razonSocial: 'Eduardo Montiel',
        nombre: 'Eduardo Montiel',
        domicilio: 'Av Principal de algun sitio',
        telefono: '+582122447664',
        email: 'correoprueba@gmail.com'
      };

      const testInvoice: Invoice = {
        id: 'test-1',
        numero: 'ND-00000001',
        numeroControl: 'DIG-2023000001',
        fecha: '2023-01-20T09:55:05Z',
        emisor: {
          nombre: 'Mi Empresa C.A.',
          rif: 'J-12345678-9',
          domicilio: 'Caracas, Venezuela'
        },
        receptor: testCustomer,
        lineas: [{
          itemId: '7591',
          codigo: '7591',
          descripcion: 'Refresco PET 500 ml',
          cantidad: 2,
          precioUnitario: 5.00,
          descuento: 0,
          baseImponible: 10.00,
          alicuotaIva: 16,
          montoIva: 1.60,
          total: 11.60,
          item: {
            id: '7591',
            nombre: 'Refresco PET 500 ml',
            descripcion: 'Refresco PET 500 ml',
            precio: 5.00,
            codigoSeniat: '7591',
            alicuotaIva: 16,
            exentoIva: false
          }
        }],
        pagos: [{
          tipo: 'transferencia_ves',
          monto: 11.60,
          aplicaIgtf: false
        }],
        subtotal: 10.00,
        baseImponible: 10.00,
        montoIva: 1.60,
        montoIgtf: 0,
        total: 11.60,
        totalUsdReferencia: 0.32,
        tasaBcv: 36.5,
        fechaTasaBcv: '2023-01-20',
        canal: 'digital',
        estado: 'nota_debito'
      };

      const originalInvoice = {
        serie: 'A',
        numero: '00000001',
        fecha: '20/01/2023',
        monto: 11.60
      };

      // Generar Nota de Débito
      const debitNote = generator.generateNotaDebito(
        testInvoice,
        testCustomer,
        originalInvoice,
        'Devolucion por daño desde fabrica'
      );

      // Validar
      const validation = validator.validateDocument(debitNote);

      const output = {
        success: true,
        validation: validation,
        document: debitNote,
        comparison: {
          expectedTipoDocumento: '03',
          actualTipoDocumento: debitNote.documentoElectronico?.Encabezado?.IdentificacionDocumento?.TipoDocumento,
          expectedTipoTransaccion: '03',
          actualTipoTransaccion: debitNote.documentoElectronico?.Encabezado?.IdentificacionDocumento?.TipoTransaccion,
          hasVendedor: !!debitNote.documentoElectronico?.Encabezado?.Vendedor,
          hasInfoAdicional: !!debitNote.documentoElectronico?.InfoAdicional
        }
      };

      setResult(JSON.stringify(output, null, 2));
    } catch (error) {
      setResult(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test de Nota de Débito</CardTitle>
          <CardDescription>
            Verifica que la generación de JSON de Nota de Débito sea funcional y completa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testDebitNoteGeneration}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Generando...' : 'Generar y Validar Nota de Débito'}
          </Button>

          {result && (
            <div className="space-y-2">
              <h3 className="font-semibold">Resultado:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}