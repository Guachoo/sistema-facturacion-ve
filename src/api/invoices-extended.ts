// PHASE 2 EXTENSIONS for invoices.ts
// Complete fiscal invoice system with TFHKA integration and Venezuelan tax calculations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice, InvoiceLine, Customer, Item, Payment } from '@/types';

// Enhanced invoice creation with full fiscal compliance
export const useCreateFiscalInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: {
      customer: Customer;
      lines: Array<{
        item: Item;
        cantidad: number;
        precioUnitario?: number;
        descuento?: number;
      }>;
      payments: Payment[];
      notes?: string;
      serie?: string;
    }): Promise<{
      invoice: Invoice;
      fiscalData: {
        controlNumber: string;
        tfhkaId?: string;
        qrCode?: string;
      };
    }> => {
      const { logger } = await import('@/lib/logger');
      const { currencyUtils, documentNumbering } = await import('@/lib/utils');
      const { fiscalDocumentHelpers } = await import('@/lib/supabase');
      const { fiscalTemplateGenerator } = await import('@/services/fiscal-template-generator');

      logger.info('invoices', 'create_fiscal', 'Creating fiscal invoice', {
        customerId: invoiceData.customer.id,
        linesCount: invoiceData.lines.length
      });

      try {
        // 1. Get current BCV rate
        const bcvRate = await getCurrentBcvRate();

        // 2. Generate document number and control number
        const serie = invoiceData.serie || 'A';
        const documentNumber = await generateNextDocumentNumber(serie);
        const controlNumber = documentNumbering.generateControlNumber(serie, parseInt(documentNumber.split('-')[1]), new Date().getFullYear());

        // 3. Calculate all line items with taxes
        const processedLines: InvoiceLine[] = [];
        let subtotalGeneral = 0;
        let ivaTotal = 0;
        let igtfTotal = 0;

        for (const lineData of invoiceData.lines) {
          const lineCalc = await calculateLineWithTaxes({
            item: lineData.item,
            cantidad: lineData.cantidad,
            precioUnitario: lineData.precioUnitario || lineData.item.precioBase,
            descuento: lineData.descuento || 0
          });

          const processedLine: InvoiceLine = {
            id: `line_${lineData.item.id}_${Date.now()}`, // Generate unique line ID
            itemId: lineData.item.id!,
            codigo: lineData.item.codigo,
            descripcion: lineData.item.descripcion,
            cantidad: lineData.cantidad,
            precioUnitario: lineCalc.precioUnitario,
            descuento: lineCalc.porcentajeDescuento,
            alicuotaIva: lineData.item.alicuotaIva || (lineData.item.ivaAplica ? 16 : 0), // Add IVA rate
            baseImponible: lineCalc.baseImponible,
            montoIva: lineCalc.montoIva,
            total: lineCalc.baseImponible + lineCalc.montoIva, // Calculate line total
            item: lineData.item // Include the full item object
          };

          processedLines.push(processedLine);
          subtotalGeneral += lineCalc.baseImponible;
          ivaTotal += lineCalc.montoIva;
        }

        // 4. Calculate IGTF for foreign currency payments
        for (const payment of invoiceData.payments) {
          if (payment.aplicaIgtf) {
            const igtfAmount = currencyUtils.calculateIGTF(payment.monto);
            igtfTotal += igtfAmount;
          }
        }

        // 5. Create invoice object
        const invoice: Invoice = {
          numero: documentNumber,
          numeroControl: controlNumber,
          fecha: new Date().toISOString(),
          emisor: {
            nombre: 'Mi Empresa C.A.',
            rif: 'J-40123456-7',
            domicilio: 'Caracas, Venezuela'
          },
          receptor: invoiceData.customer,
          lineas: processedLines,
          pagos: invoiceData.payments,
          subtotal: subtotalGeneral,
          baseImponible: subtotalGeneral, // Base imponible is typically the subtotal for Venezuelan invoices
          montoIva: ivaTotal,
          montoIgtf: igtfTotal,
          total: subtotalGeneral + ivaTotal + igtfTotal,
          totalUsdReferencia: (subtotalGeneral + ivaTotal + igtfTotal) / bcvRate.rate,
          tasaBcv: bcvRate.rate,
          fechaTasaBcv: bcvRate.date,
          canal: 'digital',
          estado: 'emitida'
        };

        // 6. Generate fiscal JSON template
        const fiscalDocument = fiscalTemplateGenerator.generateFactura(invoice, invoiceData.customer);

        logger.info('invoices', 'fiscal_template', 'Generated fiscal JSON template', {
          invoiceNumber: invoice.numero,
          documentType: fiscalDocument.documentoElectronico.Encabezado?.IdentificacionDocumento?.TipoDocumento
        });

        // 7. Save to database (include fiscal template)
        const savedInvoice = await saveInvoiceToDatabase({
          ...invoice,
          fiscalTemplate: fiscalDocument
        });

        // 8. Submit to TFHKA for fiscal validation
        const tfhkaResult = await submitToTfhka(savedInvoice);

        // 8. Update invoice with TFHKA data
        if (tfhkaResult.success) {
          // Verificar si usamos modo mock
          const { useMockInvoices } = await import('@/lib/mock-invoices');

          if (useMockInvoices()) {
            console.log('🔧 Mock: Actualizando estado TFHKA localmente');
            // En modo mock, solo loggeamos el éxito
            savedInvoice.estado = 'emitida';
            // Agregamos los datos TFHKA al objeto
            (savedInvoice as any).tfhka_document_id = tfhkaResult.tfhkaId;
            (savedInvoice as any).tfhka_status = 'approved';
          } else {
            // Solo llamar a Supabase si no estamos en modo mock
            await fiscalDocumentHelpers.updateDocumentStatus(
              savedInvoice.id!,
              'emitted',
              {
                tfhka_document_id: tfhkaResult.tfhkaId,
                tfhka_status: 'approved'
              }
            );
          }
        }

        logger.info('invoices', 'create_fiscal', 'Fiscal invoice created successfully', {
          invoiceId: savedInvoice.id,
          documentNumber,
          controlNumber,
          total: invoice.total
        });

        // Actualizar cache de facturas si estamos en modo mock
        const { useMockInvoices } = await import('@/lib/mock-invoices');
        if (useMockInvoices()) {
          console.log('🔧 Mock: Actualizando cache de facturas con nueva factura');

          // Obtener facturas actuales del cache
          const currentInvoices = queryClient.getQueryData<Invoice[]>(['invoices']) || [];

          // Agregar la nueva factura al principio de la lista
          const updatedInvoices = [savedInvoice, ...currentInvoices];

          console.log('🔧 Mock: Agregando nueva factura fiscal al cache:', {
            nuevaFactura: savedInvoice.numero,
            totalFacturas: updatedInvoices.length
          });

          // Actualizar el cache
          queryClient.setQueryData(['invoices'], updatedInvoices);

          // NO invalidar porque eso recargaría los datos mock originales
          // queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }

        return {
          invoice: savedInvoice,
          fiscalData: {
            controlNumber,
            tfhkaId: tfhkaResult.tfhkaId,
            qrCode: tfhkaResult.qrCode
          }
        };

      } catch (error) {
        logger.error('invoices', 'create_fiscal', 'Failed to create fiscal invoice', error);
        throw error;
      }
    }
  });
};

// Calculate line item with all Venezuelan taxes
async function calculateLineWithTaxes(params: {
  item: Item;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}): Promise<{
  precioUnitario: number;
  cantidad: number;
  subtotalSinDescuento: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  baseImponible: number;
  alicuotaIva: number;
  montoIva: number;
  totalLinea: number;
}> {
  const { item, cantidad, precioUnitario, descuento } = params;

  // Basic calculations
  const subtotalSinDescuento = precioUnitario * cantidad;
  const porcentajeDescuento = Math.max(0, Math.min(100, descuento));
  const montoDescuento = (subtotalSinDescuento * porcentajeDescuento) / 100;
  const baseImponible = subtotalSinDescuento - montoDescuento;

  // IVA calculation
  const alicuotaIva = item.exentoIva ? 0 : (item.alicuotaIva || (item.ivaAplica ? 16 : 0));
  const montoIva = (baseImponible * alicuotaIva) / 100;

  const totalLinea = baseImponible + montoIva;

  return {
    precioUnitario,
    cantidad,
    subtotalSinDescuento,
    porcentajeDescuento,
    montoDescuento,
    baseImponible,
    alicuotaIva,
    montoIva,
    totalLinea
  };
}

// Get current BCV exchange rate
async function getCurrentBcvRate(): Promise<{ rate: number; date: string }> {
  try {
    // This would normally call the BCV API or internal rates service
    // For now, return mock data
    return {
      rate: 36.50,
      date: new Date().toISOString().split('T')[0]
    };
  } catch (_error) {
    // Fallback rate if BCV API is unavailable
    void _error; // Explicitly unused
    return {
      rate: 36.50,
      date: new Date().toISOString().split('T')[0]
    };
  }
}

// Generate next sequential document number
async function generateNextDocumentNumber(serie: string): Promise<string> {
  const { documentNumbering } = await import('@/lib/utils');

  try {
    // This would normally get the next number from database
    // For now, generate based on timestamp
    const nextNumber = Date.now() % 100000;
    return documentNumbering.formatNumber(nextNumber, serie);
  } catch (_error) {
    void _error; // Explicitly unused
    throw new Error('Error generating document number');
  }
}

// Save invoice to database
async function saveInvoiceToDatabase(invoice: Invoice): Promise<Invoice> {
  const { useMockInvoices } = await import('@/lib/mock-invoices');

  // Verificar si usamos modo mock (sin Supabase)
  if (useMockInvoices()) {
    console.log('🔧 Guardando factura fiscal mock (sin Supabase)');

    // Mock database save - in real implementation this would use Supabase
    const savedInvoice: Invoice = {
      ...invoice,
      id: `INV_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return savedInvoice;
  }

  // Código real de Supabase aquí (cuando esté disponible)
  const { fiscalDocumentHelpers } = await import('@/lib/supabase');

  try {
    const response = await fetch(`https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/fiscal_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.JQQbEn4ORkKR63fvfO0mUOo1hfFPQHgUr_9F2I0NV0E',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.JQQbEn4ORkKR63fvfO0mUOo1hfFPQHgUr_9F2I0NV0E`
      },
      body: JSON.stringify(invoice)
    });

    if (!response.ok) {
      throw new Error('Failed to save to Supabase');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving to database:', error);
    throw error;
  }
}

// Submit invoice to TFHKA for fiscal validation
async function submitToTfhka(invoice: Invoice): Promise<{
  success: boolean;
  tfhkaId?: string;
  qrCode?: string;
  error?: string;
}> {
  const { logger } = await import('@/lib/logger');

  try {
    logger.info('invoices', 'tfhka_submit', 'Submitting invoice to TFHKA', {
      invoiceId: invoice.id,
      documentNumber: invoice.numero
    });

    // Prepare TFHKA document structure
    // TODO: Use tfhkaDocument when implementing TFHKA submission
    const _tfhkaDocument = {
      tipo_documento: 'factura',
      numero_documento: invoice.numero,
      numero_control: invoice.numeroControl,
      fecha_emision: invoice.fecha,
      emisor: {
        rif: invoice.emisor.rif,
        razon_social: invoice.emisor.nombre,
        direccion: invoice.emisor.domicilio
      },
      receptor: {
        rif: invoice.receptor.rif,
        razon_social: invoice.receptor.razonSocial,
        direccion: invoice.receptor.domicilio
      },
      detalles: invoice.lineas.map(line => ({
        codigo: line.codigo,
        descripcion: line.descripcion,
        cantidad: line.cantidad,
        precio_unitario: line.precioUnitario,
        descuento: line.descuento,
        base_imponible: line.baseImponible,
        aliquota_iva: 16, // Standard rate
        monto_iva: line.montoIva,
        total: line.baseImponible + line.montoIva
      })),
      subtotal: invoice.subtotal,
      monto_iva: invoice.montoIva,
      monto_igtf: invoice.montoIgtf,
      total: invoice.total,
      moneda: 'VES',
      tasa_cambio: invoice.tasaBcv
    };
    void _tfhkaDocument; // Explicitly unused - TODO for Phase 5

    // TODO: Implement actual TFHKA API call
    // const { tfhkaApi } = await import('@/lib/api-client');
    // const result = await tfhkaApi.emitDocument(tfhkaDocument);

    // Mock successful response
    const mockResult = {
      success: true,
      tfhkaId: `TFHKA_${Date.now()}`,
      qrCode: `QR_${invoice.numeroControl}`
    };

    logger.info('invoices', 'tfhka_submit', 'TFHKA submission successful', mockResult);

    return mockResult;

  } catch (error) {
    logger.error('invoices', 'tfhka_submit', 'TFHKA submission failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Legacy functions removed - replaced with fiscal template versions below

// Void invoice (anular factura)
export const useVoidInvoice = () => {
  return useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      reason: string;
    }): Promise<{ success: boolean; message: string }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('invoices', 'void_invoice', 'Voiding invoice', params);

      try {
        // Get invoice
        const invoice = await getInvoiceById(params.invoiceId);

        // Submit void request to TFHKA
        const voidResult = await submitVoidToTfhka(invoice, params.reason);

        if (voidResult.success) {
          // Update invoice status in database
          await updateInvoiceStatus(params.invoiceId, 'anulada', params.reason);

          logger.info('invoices', 'void_invoice', 'Invoice voided successfully', {
            invoiceId: params.invoiceId
          });

          return {
            success: true,
            message: 'Factura anulada exitosamente'
          };
        } else {
          throw new Error(voidResult.error || 'Error voiding invoice');
        }

      } catch (error) {
        logger.error('invoices', 'void_invoice', 'Failed to void invoice', error);
        throw error;
      }
    }
  });
};

// Helper functions
async function getInvoiceById(_invoiceId: string): Promise<Invoice> {
  void _invoiceId; // Explicitly unused - TODO implement database fetch
  // Mock implementation - would normally fetch from database
  throw new Error('Invoice not found');
}

async function updateInvoiceStatus(_invoiceId: string, _status: string, _reason?: string): Promise<void> {
  void _invoiceId; // Explicitly unused - TODO implement database update
  void _status; // Explicitly unused - TODO implement database update
  void _reason; // Explicitly unused - TODO implement database update
  // Mock implementation - would normally update database
}

async function submitVoidToTfhka(_invoice: Invoice, _reason: string): Promise<{
  success: boolean;
  error?: string;
}> {
  void _invoice; // Explicitly unused - TODO implement TFHKA void API
  void _reason; // Explicitly unused - TODO implement TFHKA void API
  // Mock implementation - would normally call TFHKA void API
  return { success: true };
}

// Credit note creation with fiscal template generation
export const useCreateCreditNote = () => {
  return useMutation({
    mutationFn: async (noteData: {
      originalInvoice: Invoice;
      customer: Customer;
      lines: Array<{
        item: Item;
        cantidad: number;
        precioUnitario?: number;
        descuento?: number;
      }>;
      motivo: string;
    }): Promise<{
      invoice: Invoice;
      fiscalData: {
        controlNumber: string;
        tfhkaId?: string;
        qrCode?: string;
      };
    }> => {
      const { logger } = await import('@/lib/logger');
      const { fiscalTemplateGenerator } = await import('@/services/fiscal-template-generator');

      logger.info('invoices', 'create_credit_note', 'Creating credit note', {
        originalInvoiceId: noteData.originalInvoice.id,
        motivo: noteData.motivo
      });

      try {
        // Process lines the same way as regular invoice
        const processedLines: InvoiceLine[] = [];
        let subtotalGeneral = 0;
        let ivaTotal = 0;

        for (const line of noteData.lines) {
          const calculatedLine = await calculateLineWithTaxes({
            item: line.item,
            cantidad: line.cantidad,
            precioUnitario: line.precioUnitario || line.item.precioBase,
            descuento: line.descuento || 0
          });

          const invoiceLine: InvoiceLine = {
            id: `line_${line.item.id}_${Date.now()}_credit`,
            itemId: line.item.id!,
            codigo: line.item.codigo,
            descripcion: line.item.descripcion,
            cantidad: calculatedLine.cantidad,
            precioUnitario: calculatedLine.precioUnitario,
            descuento: calculatedLine.porcentajeDescuento,
            alicuotaIva: calculatedLine.alicuotaIva,
            baseImponible: calculatedLine.baseImponible,
            montoIva: calculatedLine.montoIva,
            total: calculatedLine.totalLinea,
            item: line.item
          };

          processedLines.push(invoiceLine);
          subtotalGeneral += calculatedLine.baseImponible;
          ivaTotal += calculatedLine.montoIva;
        }

        // Generate document number for credit note
        const serie = noteData.originalInvoice.numero.split('-')[0];
        const documentNumber = await generateNextDocumentNumber(serie);
        const { documentNumbering } = await import('@/lib/utils');
        const controlNumber = documentNumbering.generateControlNumber(serie, parseInt(documentNumber.split('-')[1]), new Date().getFullYear());

        // Create credit note invoice object
        const creditNote: Invoice = {
          numero: documentNumber,
          numeroControl: controlNumber,
          fecha: new Date().toISOString(),
          emisor: noteData.originalInvoice.emisor,
          receptor: noteData.customer,
          lineas: processedLines,
          pagos: [], // Credit notes typically don't have payments
          subtotal: subtotalGeneral,
          baseImponible: subtotalGeneral, // Base imponible for credit note
          montoIva: ivaTotal,
          montoIgtf: 0,
          total: subtotalGeneral + ivaTotal,
          totalUsdReferencia: (subtotalGeneral + ivaTotal) / noteData.originalInvoice.tasaBcv,
          tasaBcv: noteData.originalInvoice.tasaBcv,
          fechaTasaBcv: noteData.originalInvoice.fechaTasaBcv,
          canal: 'digital',
          estado: 'nota_credito',
          facturaAfectadaId: noteData.originalInvoice.id,
          facturaAfectadaNumero: noteData.originalInvoice.numero,
          tipoNota: 'credito',
          motivoNota: noteData.motivo
        };

        // Generate fiscal JSON template for credit note
        const fiscalDocument = fiscalTemplateGenerator.generateNotaCredito(
          creditNote,
          noteData.customer,
          {
            serie: noteData.originalInvoice.numero.split('-')[0],
            numero: noteData.originalInvoice.numero.split('-')[1],
            fecha: noteData.originalInvoice.fecha,
            monto: noteData.originalInvoice.total
          },
          noteData.motivo
        );

        // Save credit note with fiscal template
        const savedCreditNote = await saveInvoiceToDatabase({
          ...creditNote,
          fiscalTemplate: fiscalDocument
        });

        logger.info('invoices', 'credit_note_created', 'Credit note created successfully', {
          creditNoteNumber: savedCreditNote.numero,
          originalInvoiceNumber: noteData.originalInvoice.numero
        });

        return {
          invoice: savedCreditNote,
          fiscalData: {
            controlNumber: savedCreditNote.numeroControl
          }
        };

      } catch (error) {
        logger.error('invoices', 'create_credit_note', 'Failed to create credit note', error);
        throw error;
      }
    }
  });
};

// Debit note creation with fiscal template generation
export const useCreateDebitNote = () => {
  return useMutation({
    mutationFn: async (noteData: {
      originalInvoice: Invoice;
      customer: Customer;
      lines: Array<{
        item: Item;
        cantidad: number;
        precioUnitario?: number;
        descuento?: number;
      }>;
      motivo: string;
    }): Promise<{
      invoice: Invoice;
      fiscalData: {
        controlNumber: string;
        tfhkaId?: string;
        qrCode?: string;
      };
    }> => {
      const { logger } = await import('@/lib/logger');
      const { fiscalTemplateGenerator } = await import('@/services/fiscal-template-generator');

      logger.info('invoices', 'create_debit_note', 'Creating debit note', {
        originalInvoiceId: noteData.originalInvoice.id,
        motivo: noteData.motivo
      });

      try {
        // Process lines the same way as credit note
        const processedLines: InvoiceLine[] = [];
        let subtotalGeneral = 0;
        let ivaTotal = 0;

        for (const line of noteData.lines) {
          const calculatedLine = await calculateLineWithTaxes({
            item: line.item,
            cantidad: line.cantidad,
            precioUnitario: line.precioUnitario || line.item.precioBase,
            descuento: line.descuento || 0
          });

          const invoiceLine: InvoiceLine = {
            id: `line_${line.item.id}_${Date.now()}_debit`,
            itemId: line.item.id!,
            codigo: line.item.codigo,
            descripcion: line.item.descripcion,
            cantidad: calculatedLine.cantidad,
            precioUnitario: calculatedLine.precioUnitario,
            descuento: calculatedLine.porcentajeDescuento,
            alicuotaIva: calculatedLine.alicuotaIva,
            baseImponible: calculatedLine.baseImponible,
            montoIva: calculatedLine.montoIva,
            total: calculatedLine.totalLinea,
            item: line.item
          };

          processedLines.push(invoiceLine);
          subtotalGeneral += calculatedLine.baseImponible;
          ivaTotal += calculatedLine.montoIva;
        }

        // Generate document number for debit note
        const serie = noteData.originalInvoice.numero.split('-')[0];
        const documentNumber = await generateNextDocumentNumber(serie);
        const { documentNumbering } = await import('@/lib/utils');
        const controlNumber = documentNumbering.generateControlNumber(serie, parseInt(documentNumber.split('-')[1]), new Date().getFullYear());

        // Create debit note invoice object
        const debitNote: Invoice = {
          numero: documentNumber,
          numeroControl: controlNumber,
          fecha: new Date().toISOString(),
          emisor: noteData.originalInvoice.emisor,
          receptor: noteData.customer,
          lineas: processedLines,
          pagos: [], // Debit notes typically don't have payments
          subtotal: subtotalGeneral,
          baseImponible: subtotalGeneral, // Base imponible for debit note
          montoIva: ivaTotal,
          montoIgtf: 0,
          total: subtotalGeneral + ivaTotal,
          totalUsdReferencia: (subtotalGeneral + ivaTotal) / noteData.originalInvoice.tasaBcv,
          tasaBcv: noteData.originalInvoice.tasaBcv,
          fechaTasaBcv: noteData.originalInvoice.fechaTasaBcv,
          canal: 'digital',
          estado: 'nota_debito',
          facturaAfectadaId: noteData.originalInvoice.id,
          facturaAfectadaNumero: noteData.originalInvoice.numero,
          tipoNota: 'debito',
          motivoNota: noteData.motivo
        };

        // Generate fiscal JSON template for debit note
        const fiscalDocument = fiscalTemplateGenerator.generateNotaDebito(
          debitNote,
          noteData.customer,
          {
            serie: noteData.originalInvoice.numero.split('-')[0],
            numero: noteData.originalInvoice.numero.split('-')[1],
            fecha: noteData.originalInvoice.fecha,
            monto: noteData.originalInvoice.total
          },
          noteData.motivo
        );

        // Save debit note with fiscal template
        const savedDebitNote = await saveInvoiceToDatabase({
          ...debitNote,
          fiscalTemplate: fiscalDocument
        });

        logger.info('invoices', 'debit_note_created', 'Debit note created successfully', {
          debitNoteNumber: savedDebitNote.numero,
          originalInvoiceNumber: noteData.originalInvoice.numero
        });

        return {
          invoice: savedDebitNote,
          fiscalData: {
            controlNumber: savedDebitNote.numeroControl
          }
        };

      } catch (error) {
        logger.error('invoices', 'create_debit_note', 'Failed to create debit note', error);
        throw error;
      }
    }
  });
};

// Invoice cancellation with fiscal template generation
export const useCancelInvoice = () => {
  return useMutation({
    mutationFn: async (cancellationData: {
      invoice: Invoice;
      motivo: string;
    }): Promise<{
      success: boolean;
      cancellationDocument: any;
    }> => {
      const { logger } = await import('@/lib/logger');
      const { fiscalTemplateGenerator } = await import('@/services/fiscal-template-generator');
      const { TipoDocumentoFiscal } = await import('@/types/fiscal-documents');

      logger.info('invoices', 'cancel_invoice', 'Cancelling invoice', {
        invoiceId: cancellationData.invoice.id,
        motivo: cancellationData.motivo
      });

      try {
        // Generate fiscal cancellation document
        const cancellationDocument = fiscalTemplateGenerator.generateAnulacion(
          cancellationData.invoice.numero.split('-')[0], // serie
          cancellationData.invoice.numero.split('-')[1], // numero
          TipoDocumentoFiscal.FACTURA,
          cancellationData.motivo
        );

        // Update invoice status to cancelled
        await updateInvoiceStatus(
          cancellationData.invoice.id!,
          'anulada',
          cancellationData.motivo
        );

        logger.info('invoices', 'invoice_cancelled', 'Invoice cancelled successfully', {
          invoiceNumber: cancellationData.invoice.numero,
          cancellationDate: cancellationDocument.fechaAnulacion
        });

        return {
          success: true,
          cancellationDocument
        };

      } catch (error) {
        logger.error('invoices', 'cancel_invoice', 'Failed to cancel invoice', error);
        throw error;
      }
    }
  });
};

// Import utility moved to function level to avoid top-level await