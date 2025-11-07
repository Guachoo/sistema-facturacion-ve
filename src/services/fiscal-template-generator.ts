/**
 * Venezuelan Fiscal Document Template Generator
 * Generates SENIAT-compliant JSON documents for invoices, credit notes, debit notes, and cancellations
 */

import {
  VenezuelanFiscalDocument,
  AnulacionDocument,
  TipoDocumentoFiscal,
  CodigoImpuestoVenezuela,
  FormaPagoVenezuela,
  TipoIdentificacionVenezuela,
  SujetoRetenido,
  TotalesRetencion,
  DetalleRetencion,
  ComprobanteRetencionHeader
} from '@/types/fiscal-documents';
import type { Invoice, InvoiceLine, Customer, CompanySettings } from '@/types';

// Configuration for fiscal document generation
export interface FiscalDocumentConfig {
  company: CompanySettings;
  serie: string;
  sucursal: string;
  vendedor: {
    codigo: string;
    nombre: string;
    numCajero: string;
  };
}

export class FiscalTemplateGenerator {
  private config: FiscalDocumentConfig;

  constructor(config: FiscalDocumentConfig) {
    this.config = config;
  }

  /**
   * Generate a fiscal invoice (Factura) JSON document
   */
  generateFactura(invoice: Invoice, customer: Customer): VenezuelanFiscalDocument {
    const now = new Date();
    const fechaEmision = this.formatDateVE(new Date(invoice.fecha));
    const horaEmision = this.formatTimeVE(now);

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: {
            TipoDocumento: TipoDocumentoFiscal.FACTURA,
            NumeroDocumento: this.formatDocumentNumber(invoice.numero),
            TipoProveedor: null,
            TipoTransaccion: null,
            NumeroPlanillaImportacion: null,
            NumeroExpedienteImportacion: null,
            SerieFacturaAfectada: null,
            NumeroFacturaAfectada: null,
            FechaFacturaAfectada: null,
            MontoFacturaAfectada: null,
            ComentarioFacturaAfectada: null,
            RegimenEspTributacion: null,
            FechaEmision: fechaEmision,
            FechaVencimiento: invoice.fechaVencimiento ? this.formatDateVE(new Date(invoice.fechaVencimiento)) : null,
            HoraEmision: horaEmision,
            Anulado: false,
            TipoDePago: "importado", // Default for imports/standard
            Serie: this.config.serie,
            Sucursal: this.config.sucursal,
            TipoDeVenta: "interna", // Internal sale
            Moneda: invoice.moneda || "VES"
          },
          Vendedor: {
            Codigo: this.config.vendedor.codigo,
            Nombre: this.config.vendedor.nombre,
            NumCajero: this.config.vendedor.numCajero
          },
          Comprador: {
            TipoIdentificacion: this.extractRifType(customer.rif),
            NumeroIdentificacion: this.cleanRif(customer.rif),
            RazonSocial: customer.razonSocial || customer.nombre,
            Direccion: customer.domicilio || "No especificada",
            Pais: "VE",
            Telefono: customer.telefono ? [customer.telefono] : [],
            Correo: customer.email ? [customer.email] : []
          },
          SujetoRetenido: null,
          Totales: {
            NroItems: invoice.lineas.length.toString().padStart(2, '0'),
            MontoGravadoTotal: this.formatAmount(invoice.baseImponible),
            MontoExentoTotal: invoice.montoExento ? this.formatAmount(invoice.montoExento) : null,
            Subtotal: this.formatAmount(invoice.subtotal),
            TotalAPagar: this.formatAmount(invoice.total),
            TotalIVA: this.formatAmount(invoice.montoIva),
            MontoTotalConIVA: this.formatAmount(invoice.subtotal + invoice.montoIva),
            MontoEnLetras: this.numberToWords(invoice.total),
            TotalDescuento: invoice.descuento ? this.formatAmount(invoice.descuento) : null,
            ListaDescBonificacion: null,
            ImpuestosSubtotal: this.generateTaxSubtotals(invoice),
            FormasPago: this.generatePaymentMethods(invoice)
          },
          TotalesRetencion: null
        },
        DetallesItems: this.generateItemDetails(invoice.lineas),
        DetallesRetencion: null,
        Viajes: null,
        InfoAdicional: this.generateAdditionalInfo(invoice),
        GuiaDespacho: null
      }
    };
  }

  /**
   * Generate a credit note (Nota de Crédito) JSON document
   */
  generateNotaCredito(
    invoice: Invoice,
    customer: Customer,
    originalInvoice: { serie: string; numero: string; fecha: string; monto: number },
    motivo: string
  ): VenezuelanFiscalDocument {
    const now = new Date();
    const fechaEmision = this.formatDateVE(now);
    const horaEmision = this.formatTimeVE(now);

    const creditNote = this.generateFactura(invoice, customer);

    // Modify specific fields for credit note
    if (creditNote.documentoElectronico.Encabezado?.IdentificacionDocumento) {
      const identification = creditNote.documentoElectronico.Encabezado.IdentificacionDocumento;
      identification.TipoDocumento = TipoDocumentoFiscal.NOTA_CREDITO;
      identification.TipoTransaccion = "03"; // Credit note transaction
      identification.SerieFacturaAfectada = originalInvoice.serie;
      identification.NumeroFacturaAfectada = this.formatDocumentNumber(originalInvoice.numero);
      identification.FechaFacturaAfectada = this.formatDateVE(new Date(originalInvoice.fecha));
      identification.MontoFacturaAfectada = this.formatAmount(originalInvoice.monto);
      identification.ComentarioFacturaAfectada = motivo;
      identification.FechaEmision = fechaEmision;
      identification.HoraEmision = horaEmision;
    }

    return creditNote;
  }

  /**
   * Generate a debit note (Nota de Débito) JSON document
   */
  generateNotaDebito(
    invoice: Invoice,
    customer: Customer,
    originalInvoice: { serie: string; numero: string; fecha: string; monto: number },
    motivo: string
  ): VenezuelanFiscalDocument {
    const debitNote = this.generateNotaCredito(invoice, customer, originalInvoice, motivo);

    // Change document type to debit note
    if (debitNote.documentoElectronico.Encabezado?.IdentificacionDocumento) {
      debitNote.documentoElectronico.Encabezado.IdentificacionDocumento.TipoDocumento = TipoDocumentoFiscal.NOTA_DEBITO;
      debitNote.documentoElectronico.Encabezado.IdentificacionDocumento.TipoTransaccion = "03"; // Debit note transaction (same as credit)
    }

    return debitNote;
  }

  /**
   * Generate a cancellation (Anulación) JSON document
   */
  generateAnulacion(
    serie: string,
    numeroDocumento: string,
    tipoDocumento: TipoDocumentoFiscal,
    motivo: string
  ): AnulacionDocument {
    const now = new Date();

    return {
      serie,
      tipoDocumento,
      numeroDocumento: this.formatDocumentNumber(numeroDocumento),
      motivoAnulacion: motivo,
      fechaAnulacion: this.formatDateVE(now),
      horaAnulacion: this.formatTimeVE(now)
    };
  }

  /**
   * Generate a retention certificate (Comprobante de Retención) JSON document
   */
  generateComprobanteRetencion(
    numeroComprobante: string,
    sujetoRetenido: {
      rif: string;
      razonSocial: string;
      direccion: string;
      telefono?: string;
      email?: string;
    },
    detallesFacturas: Array<{
      fechaDocumento: string;
      serie: string;
      numeroDocumento: string;
      numeroControl: string;
      montoTotal: number;
      montoExento: number;
      baseImponible: number;
      porcentajeIVA: number;
      montoIVA: number;
      retenidoIVA: number;
      percibido: number;
      moneda: string;
    }>
  ): VenezuelanFiscalDocument {
    const now = new Date();
    const fechaEmision = this.formatDateVE(now);
    const horaEmision = this.formatTimeVE(now);

    // Calcular totales usando funciones existentes
    const totalBaseImponible = detallesFacturas.reduce((sum, detalle) => sum + detalle.baseImponible, 0);
    const totalIVA = detallesFacturas.reduce((sum, detalle) => sum + detalle.montoIVA, 0);
    const totalRetenido = detallesFacturas.reduce((sum, detalle) => sum + (detalle.montoIVA * detalle.retenidoIVA / 100), 0);

    return {
      documentoElectronico: {
        Encabezado: {
          IdentificacionDocumento: {
            TipoDocumento: TipoDocumentoFiscal.COMPROBANTE_RETENCION,
            NumeroDocumento: this.formatDocumentNumber(numeroComprobante),
            TipoProveedor: null,
            TipoTransaccion: "05", // Comprobante de retención
            NumeroPlanillaImportacion: null,
            NumeroExpedienteImportacion: null,
            SerieFacturaAfectada: null,
            NumeroFacturaAfectada: null,
            FechaFacturaAfectada: null,
            MontoFacturaAfectada: null,
            ComentarioFacturaAfectada: null,
            RegimenEspTributacion: null,
            FechaEmision: fechaEmision,
            FechaVencimiento: null,
            HoraEmision: horaEmision,
            Anulado: false,
            TipoDePago: null,
            Serie: this.config.serie,
            Sucursal: this.config.sucursal,
            TipoDeVenta: null,
            Moneda: "VES"
          },
          Vendedor: null, // No aplica para retenciones
          Comprador: null, // Se usa SujetoRetenido
          SujetoRetenido: {
            TipoIdentificacion: this.extractRifType(sujetoRetenido.rif),
            NumeroIdentificacion: this.cleanRif(sujetoRetenido.rif),
            RazonSocial: sujetoRetenido.razonSocial,
            Direccion: sujetoRetenido.direccion,
            Pais: "VE",
            Telefono: sujetoRetenido.telefono ? [sujetoRetenido.telefono] : [],
            Correo: sujetoRetenido.email ? [sujetoRetenido.email] : []
          },
          Totales: null, // Se usa TotalesRetencion
          TotalesRetencion: {
            TotalBaseImponible: this.formatAmount(totalBaseImponible),
            TotalIVA: this.formatAmount(totalIVA),
            TotalRetenido: this.formatAmount(totalRetenido)
          }
        },
        DetallesItems: null, // No aplica para retenciones
        DetallesRetencion: detallesFacturas.map((detalle, index) => ({
          NumeroLinea: (index + 1).toString(),
          FechaDocumento: this.formatDateVE(new Date(detalle.fechaDocumento)),
          SerieDocumento: detalle.serie,
          TipoDocumento: "01", // Factura original
          NumeroDocumento: this.formatDocumentNumber(detalle.numeroDocumento),
          NumeroControl: detalle.numeroControl,
          TipoTransaccion: "01", // Factura
          MontoTotal: this.formatAmount(detalle.montoTotal),
          MontoExento: this.formatAmount(detalle.montoExento),
          BaseImponible: this.formatAmount(detalle.baseImponible),
          PorcentajeIVA: this.formatAmount(detalle.porcentajeIVA),
          MontoIVA: this.formatAmount(detalle.montoIVA),
          RetenidoIVA: detalle.retenidoIVA.toString(),
          Percibido: detalle.percibido.toString(),
          Moneda: detalle.moneda,
          InfoAdicionalItem: null
        })),
        Viajes: null,
        InfoAdicional: [{
          Campo: "Informativo",
          Valor: "Comprobante de Retención de IVA emitido según las disposiciones del SENIAT"
        }],
        GuiaDespacho: null
      }
    };
  }

  // Helper methods for document generation

  private generateItemDetails(lineas: InvoiceLine[]) {
    return lineas.map((linea, index) => ({
      NumeroLinea: (index + 1).toString(),
      CodigoCIIU: null,
      CodigoPLU: linea.codigo || `PLU${index + 1}`,
      IndicadorBienoServicio: "1", // Default to product, could be derived from item type
      Descripcion: linea.descripcion,
      Cantidad: linea.cantidad.toString(),
      UnidadMedida: "NIU", // Default unit, could be configurable
      PrecioUnitario: this.formatAmount(linea.precioUnitario),
      PrecioUnitarioDescuento: linea.descuento ? this.formatAmount(linea.precioUnitario - linea.descuento) : null,
      MontoBonificacion: null,
      DescripcionBonificacion: null,
      DescuentoMonto: linea.descuento ? this.formatAmount(linea.descuento) : null,
      PrecioItem: this.formatAmount(linea.baseImponible),
      CodigoImpuesto: this.determineVatCode(linea.alicuotaIva),
      TasaIVA: this.formatAmount(linea.alicuotaIva),
      ValorIVA: this.formatAmount(linea.montoIva),
      ValorTotalItem: this.formatAmount(linea.baseImponible + linea.montoIva),
      InfoAdicionalItem: null,
      ListaItemOTI: null
    }));
  }

  private generateTaxSubtotals(invoice: Invoice) {
    const subtotals = [];

    // Add VAT subtotal
    if (invoice.montoIva > 0) {
      subtotals.push({
        CodigoTotalImp: "G", // General VAT
        AlicuotaImp: "16.00", // Standard VAT rate
        BaseImponibleImp: this.formatAmount(invoice.baseImponible),
        ValorTotalImp: this.formatAmount(invoice.montoIva)
      });
    }

    // Add IGTF if applicable (3% on foreign currency transactions)
    if (invoice.montoIgtf && invoice.montoIgtf > 0) {
      subtotals.push({
        CodigoTotalImp: "IGTF",
        AlicuotaImp: "3.00",
        BaseImponibleImp: this.formatAmount(invoice.baseImponible),
        ValorTotalImp: this.formatAmount(invoice.montoIgtf)
      });
    }

    return subtotals;
  }

  private generatePaymentMethods(invoice: Invoice) {
    // Default payment method - this would normally come from invoice payment data
    return [{
      Descripcion: "Efectivo Moneda Curso legal",
      Fecha: this.formatDateVE(new Date(invoice.fecha)),
      Forma: FormaPagoVenezuela.EFECTIVO_VES,
      Monto: this.formatAmount(invoice.total),
      Moneda: invoice.moneda || "VES",
      TipoCambio: invoice.tasaBcv ? this.formatAmount(invoice.tasaBcv) : null
    }];
  }

  private generateAdditionalInfo(invoice: Invoice) {
    const info = [];

    // Standard IGTF notice
    info.push({
      Campo: "Informativo",
      Valor: "Este pago estará sujeto al cobro adicional del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF), de conformidad con la Providencia Administrativa SNAT/2022/000013 publicada en la G.O.N 42.339 del 17-03- 2022, en caso de ser cancelado en divisas."
    });

    // Add any custom notes
    if (invoice.notas) {
      info.push({
        Campo: "Notas",
        Valor: invoice.notas
      });
    }

    return info;
  }

  // Utility formatting methods

  private formatDateVE(date: Date): string {
    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatTimeVE(date: Date): string {
    return date.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private formatDocumentNumber(numero: string): string {
    // Ensure 8-digit format with leading zeros
    return numero.padStart(8, '0');
  }

  private extractRifType(rif: string): string {
    const match = rif.match(/^([VJGE])/);
    const rifType = match ? match[1] : "V";

    // Use enum values for type safety
    switch (rifType) {
      case "V": return TipoIdentificacionVenezuela.VENEZOLANO;
      case "J": return TipoIdentificacionVenezuela.JURIDICO;
      case "G": return TipoIdentificacionVenezuela.GOBIERNO;
      case "E": return TipoIdentificacionVenezuela.EXTRANJERO;
      default: return TipoIdentificacionVenezuela.VENEZOLANO; // Default to Venezuelan citizen
    }
  }

  private cleanRif(rif: string): string {
    // Remove RIF type letter and dashes, keep only numbers and check digit
    return rif.replace(/^[VJGE]-?/, '').replace(/-/g, '');
  }

  private determineVatCode(alicuota: number): string {
    if (alicuota === 16) return CodigoImpuestoVenezuela.GENERAL;
    if (alicuota === 8) return CodigoImpuestoVenezuela.REDUCIDO;
    if (alicuota === 31) return CodigoImpuestoVenezuela.ALCOHOL;
    return CodigoImpuestoVenezuela.EXENTO;
  }

  private numberToWords(amount: number): string {
    // TODO: Implement proper number-to-words conversion in Spanish
    // For now, return a placeholder
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    return `${integerPart} BOLIVARES CON ${decimalPart.toString().padStart(2, '0')} CENTIMOS`;
  }
}

// Factory function to create a fiscal template generator with default configuration
export function createFiscalTemplateGenerator(config: Partial<FiscalDocumentConfig> = {}): FiscalTemplateGenerator {
  const defaultConfig: FiscalDocumentConfig = {
    company: {
      rif: "J-12345678-9",
      razonSocial: "Empresa Ejemplo C.A.",
      domicilioFiscal: "Caracas, Venezuela",
      telefonos: "+58-212-000-0000",
      email: "info@empresa.com",
      condicionesVenta: "Contado"
    } as CompanySettings,
    serie: "A",
    sucursal: "0001",
    vendedor: {
      codigo: "V01",
      nombre: "Vendedor Sistema",
      numCajero: "001"
    }
  };

  return new FiscalTemplateGenerator({ ...defaultConfig, ...config });
}

// Export template generator instance for direct use
export const fiscalTemplateGenerator = createFiscalTemplateGenerator();