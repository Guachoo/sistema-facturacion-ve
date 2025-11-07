/**
 * Venezuelan Fiscal Document Types
 * Based on JSON_VARIADOS templates for SENIAT compliance
 */

// Base interfaces for Venezuelan fiscal documents
export interface VenezuelanFiscalDocument {
  documentoElectronico: DocumentoElectronico;
}

export interface DocumentoElectronico {
  Encabezado?: FiscalHeader; // PascalCase version
  encabezado?: FiscalHeader; // camelCase version (for mixed templates)
  DetallesItems?: FiscalItem[]; // PascalCase version
  detallesItems?: FiscalItem[]; // camelCase version
  DetallesRetencion?: DetalleRetencion[]; // ✅ ACTUALIZADO: Detalles de retención definidos
  Viajes?: any; // TODO: Define travel details type
  InfoAdicional?: AdditionalInfo[];
  infoAdicional?: AdditionalInfo[];
  GuiaDespacho?: any; // TODO: Define dispatch guide type
}

// Document identification section
export interface DocumentIdentification {
  TipoDocumento?: string; // "01" = Factura, "02" = Nota Crédito, "03" = Nota Débito, "05" = Comprobante Retención
  tipoDocumento?: string;
  NumeroDocumento?: string;
  numeroDocumento?: string;
  TipoProveedor?: string | null;
  tipoProveedor?: string | null;
  TipoTransaccion?: string | null;
  tipoTransaccion?: string | null;
  NumeroPlanillaImportacion?: string | null;
  NumeroExpedienteImportacion?: string | null;
  SerieFacturaAfectada?: string | null;
  NumeroFacturaAfectada?: string | null;
  numeroFacturaAfectada?: string | null;
  FechaFacturaAfectada?: string | null;
  fechaFacturaAfectada?: string | null;
  MontoFacturaAfectada?: string | null;
  montoFacturaAfectada?: string | null;
  ComentarioFacturaAfectada?: string | null;
  comentarioFacturaAfectada?: string | null;
  RegimenEspTributacion?: string | null;
  FechaEmision?: string; // Format: "DD/MM/YYYY"
  fechaEmision?: string;
  FechaVencimiento?: string | null;
  fechaVencimiento?: string | null;
  HoraEmision?: string; // Format: "HH:MM:SS am/pm"
  horaEmision?: string;
  Anulado?: boolean;
  anulado?: boolean;
  TipoDePago?: string; // "importado", "contado", etc.
  tipoDePago?: string;
  Serie?: string; // Series letter (A, B, C, etc.)
  serie?: string;
  Sucursal?: string; // Branch code "0001"
  sucursal?: string;
  TipoDeVenta?: string; // "interna", "exportacion"
  tipoDeVenta?: string;
  Moneda?: string; // "VES", "USD"
  moneda?: string;
}

// Seller information
export interface VendedorInfo {
  Codigo?: string;
  codigo?: string;
  Nombre?: string;
  nombre?: string;
  NumCajero?: string;
  numCajero?: string;
}

// Buyer/Customer information
export interface CompradorInfo {
  TipoIdentificacion?: string; // "V", "J", "G", "E"
  tipoIdentificacion?: string;
  NumeroIdentificacion?: string; // RIF/CI without dashes
  numeroIdentificacion?: string;
  RazonSocial?: string;
  razonSocial?: string;
  Direccion?: string;
  direccion?: string;
  Pais?: string; // Country code "VE"
  pais?: string;
  Telefono?: string[];
  telefono?: string[];
  Correo?: string[];
  correo?: string[];
}

// Tax subtotal information
export interface ImpuestoSubtotal {
  CodigoTotalImp?: string; // "G" = IVA General, "R" = Reducido, "E" = Exento, "P" = Petroleum, "A" = Alcohol, "IGTF" = Financial tax
  codigoTotalImp?: string;
  AlicuotaImp?: string; // Tax rate "16.00", "8.00", etc.
  alicuotaImp?: string;
  BaseImponibleImp?: string; // Taxable base amount
  baseImponibleImp?: string;
  ValorTotalImp?: string; // Total tax amount
  valorTotalImp?: string;
}

// Payment methods
export interface FormaPago {
  Descripcion?: string; // Payment method description
  descripcion?: string;
  Fecha?: string; // Payment date "DD/MM/YYYY"
  fecha?: string;
  Forma?: string; // Payment form code "05" = Debit card, "08" = Cash VES, "09" = Cash USD
  forma?: string;
  Monto?: string; // Payment amount
  monto?: string;
  Moneda?: string; // Currency "VES", "USD"
  moneda?: string;
  TipoCambio?: string | null; // Exchange rate if applicable
  tipoCambio?: string | null;
}

// Document totals
export interface TotalesDocumento {
  NroItems?: string;
  nroItems?: string;
  MontoGravadoTotal?: string; // Total taxable amount
  montoGravadoTotal?: string;
  MontoExentoTotal?: string | null; // Total exempt amount
  montoExentoTotal?: string | null;
  Subtotal?: string; // Subtotal before taxes
  subtotal?: string;
  TotalAPagar?: string; // Final total to pay
  totalAPagar?: string;
  TotalIVA?: string; // Total VAT amount
  totalIVA?: string;
  MontoTotalConIVA?: string; // Total amount with VAT
  montoTotalConIVA?: string;
  MontoEnLetras?: string; // Amount in words (Spanish)
  montoEnLetras?: string;
  TotalDescuento?: string | null; // Total discount
  totalDescuento?: string | null;
  ListaDescBonificacion?: any; // TODO: Define discount/bonus list type
  ImpuestosSubtotal?: ImpuestoSubtotal[];
  impuestosSubtotal?: ImpuestoSubtotal[];
  FormasPago?: FormaPago[];
  formasPago?: FormaPago[];
}

// Header section combining all header information
export interface FiscalHeader {
  IdentificacionDocumento?: DocumentIdentification;
  identificacionDocumento?: DocumentIdentification;
  Vendedor?: VendedorInfo;
  vendedor?: VendedorInfo;
  Comprador?: CompradorInfo;
  comprador?: CompradorInfo;
  SujetoRetenido?: any; // TODO: Define retention subject type
  Totales?: TotalesDocumento;
  totales?: TotalesDocumento;
  TotalesRetencion?: any; // TODO: Define retention totals type
}

// Item/Product line details
export interface FiscalItem {
  NumeroLinea?: string; // Line number "1", "2", etc.
  numeroLinea?: string;
  CodigoCIIU?: string | null; // Economic activity code
  codigoCIIU?: string | null;
  CodigoPLU?: string; // Product code
  codigoPLU?: string;
  IndicadorBienoServicio?: string; // "1" = Product, "2" = Service
  indicadorBienoServicio?: string;
  Descripcion?: string; // Product/service description
  descripcion?: string;
  Cantidad?: string; // Quantity
  cantidad?: string;
  UnidadMedida?: string; // Unit of measure "NIU", "KGM", etc.
  unidadMedida?: string;
  PrecioUnitario?: string; // Unit price
  precioUnitario?: string;
  PrecioUnitarioDescuento?: string | null; // Discounted unit price
  precioUnitarioDescuento?: string | null;
  MontoBonificacion?: string | null; // Bonus amount
  montoBonificacion?: string | null;
  DescripcionBonificacion?: string | null; // Bonus description
  descripcionBonificacion?: string | null;
  DescuentoMonto?: string | null; // Discount amount
  descuentoMonto?: string | null;
  PrecioItem?: string; // Total line price (quantity × unit price)
  precioItem?: string;
  CodigoImpuesto?: string; // Tax code "G", "R", "E", "P", "A"
  codigoImpuesto?: string;
  TasaIVA?: string; // VAT rate "16.00", "8.00", "0.00"
  tasaIVA?: string;
  ValorIVA?: string; // VAT amount for this line
  valorIVA?: string;
  ValorTotalItem?: string; // Total line amount including taxes
  valorTotalItem?: string;
  InfoAdicionalItem?: any; // TODO: Define additional item info type
  ListaItemOTI?: any; // TODO: Define OTI item list type
}

// Additional information fields
export interface AdditionalInfo {
  Campo?: string; // Field name
  campo?: string;
  Valor?: string; // Field value
  valor?: string;
}

// Void/Cancellation document structure
export interface AnulacionDocument {
  serie: string; // Series letter
  tipoDocumento: string; // Document type "01", "02", "03"
  numeroDocumento: string; // Document number to void
  motivoAnulacion: string; // Cancellation reason
  fechaAnulacion: string; // Cancellation date "DD/MM/YYYY"
  horaAnulacion: string; // Cancellation time "HH:MM:SS am/pm"
}

// Credit/Debit note specific data
export interface NotaCreditoDebitoData {
  originalInvoice: {
    serie: string;
    numero: string;
    fecha: string;
    monto: number;
  };
  motivo: string;
  tipoTransaccion: string; // "03" for credit/debit notes
}

// Venezuelan fiscal document types enum
export enum TipoDocumentoFiscal {
  FACTURA = "01",
  NOTA_CREDITO = "02",
  NOTA_DEBITO = "03",
  COMPROBANTE_RETENCION = "05" // ✅ AGREGADO: Comprobante de Retención
}

// Venezuelan VAT tax codes
export enum CodigoImpuestoVenezuela {
  GENERAL = "G", // 16% VAT
  REDUCIDO = "R", // 8% VAT
  EXENTO = "E", // 0% VAT
  PETROLEUM = "P", // 0% VAT (petroleum products)
  ALCOHOL = "A", // 31% VAT (alcohol/tobacco)
  IGTF = "IGTF" // 3% Financial transaction tax
}

// Venezuelan payment methods enum
export enum FormaPagoVenezuela {
  EFECTIVO_VES = "08", // Cash in VES
  EFECTIVO_USD = "09", // Cash in USD
  TARJETA_DEBITO = "05", // Debit card
  TARJETA_CREDITO = "06", // Credit card
  TRANSFERENCIA = "07", // Bank transfer
  CHEQUE = "01" // Check
}

// Venezuelan identification types
export enum TipoIdentificacionVenezuela {
  VENEZOLANO = "V", // Venezuelan citizen
  JURIDICO = "J", // Legal entity (company)
  GOBIERNO = "G", // Government entity
  EXTRANJERO = "E" // Foreign citizen
}

// Helper function to convert mixed case JSON to consistent interface
export function normalizeFiscalDocument(doc: any): VenezuelanFiscalDocument {
  const normalized: VenezuelanFiscalDocument = {
    documentoElectronico: {
      Encabezado: doc.documentoElectronico?.Encabezado || doc.documentoElectronico?.encabezado,
      DetallesItems: doc.documentoElectronico?.DetallesItems || doc.documentoElectronico?.detallesItems,
      InfoAdicional: doc.documentoElectronico?.InfoAdicional || doc.documentoElectronico?.infoAdicional,
      DetallesRetencion: doc.documentoElectronico?.DetallesRetencion,
      Viajes: doc.documentoElectronico?.Viajes,
      GuiaDespacho: doc.documentoElectronico?.GuiaDespacho
    }
  };

  return normalized;
}

// Validation helper functions
export function validateRifVenezuela(rif: string): boolean {
  const rifPattern = /^[VJGE]-?\d{8}-?\d$/;
  return rifPattern.test(rif);
}

export function validateDocumentNumber(numero: string): boolean {
  const numberPattern = /^\d{8}$/;
  return numberPattern.test(numero);
}

export function validateSerie(serie: string): boolean {
  const seriePattern = /^[A-Z]$/;
  return seriePattern.test(serie);
}

// =====================================================
// ✅ COMPROBANTE DE RETENCIÓN - INTERFACES ESPECÍFICAS
// =====================================================
// Reutiliza las estructuras existentes y agrega las específicas

// Sujeto al que se le hace la retención (reutiliza structure de Comprador/Vendedor)
export interface SujetoRetenido {
  TipoIdentificacion: TipoIdentificacionVenezuela;
  NumeroIdentificacion: string;
  RazonSocial: string;
  Direccion: string;
  Pais: string; // "VE"
  Telefono?: string[];
  Correo?: string[];
}

// Totales específicos para retenciones
export interface TotalesRetencion {
  TotalBaseImponible: string;
  TotalIVA: string;
  TotalRetenido: string;
}

// Detalle de cada retención realizada
export interface DetalleRetencion {
  NumeroLinea: string;
  FechaDocumento: string;
  SerieDocumento: string;
  TipoDocumento: string; // "01" = Factura original
  NumeroDocumento: string;
  NumeroControl: string;
  TipoTransaccion: string;
  MontoTotal: string;
  MontoExento: string;
  BaseImponible: string;
  PorcentajeIVA: string;
  MontoIVA: string;
  RetenidoIVA: string; // "100" = 100% retenido
  Percibido: string; // "60" = 60% percibido
  Moneda: string; // "VES"
  InfoAdicionalItem?: AdditionalInfo[];
}

// Header específico para comprobantes de retención (extiende FiscalHeader existente)
export interface ComprobanteRetencionHeader extends Omit<FiscalHeader, 'Vendedor' | 'Comprador' | 'Totales'> {
  SujetoRetenido: SujetoRetenido;
  TotalesRetencion: TotalesRetencion;
  Vendedor: null; // No aplica para retenciones
  Comprador: null; // Se usa SujetoRetenido en su lugar
  Totales: null; // Se usa TotalesRetencion en su lugar
}