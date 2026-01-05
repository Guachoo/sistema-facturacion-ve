// Tipos para el sistema de facturación electrónica venezolana

export interface IdentificacionDocumento {
  tipoDocumento: string; // "01" = Factura
  numeroDocumento: string;
  tipoProveedor: string;
  tipoTransaccion: string;
  numeroPlanillaImportacion?: string | null;
  numeroExpedienteImportacion?: string | null;

  // Para notas de crédito/débito
  serieFacturaAfectada?: string | null;
  numeroFacturaAfectada?: string | null;
  fechaFacturaAfectada?: string | null;
  montoFacturaAfectada?: number | null;
  comentarioFacturaAfectada?: string | null;

  regimenEspTributacion?: string | null;
  fechaEmision: string; // dd/mm/aaaa
  fechaVencimiento: string; // dd/mm/aaaa
  horaEmision: string; // hh:mm:ss am/pm
  anulado: boolean;

  tipoDePago: string;
  serie: string;
  sucursal: string;
  tipoDeVenta: string;
  moneda: string; // "VES"
}

export interface Vendedor {
  codigo: string;
  nombre: string;
  numCajero: string;
}

export interface Comprador {
  tipoIdentificacion: string; // "V", "J", "E", "P", "G"
  numeroIdentificacion: string;
  razonSocial: string;
  tipoDePago?: string | null;
  serie: string;
  sucursal: string;
  tipoDeVenta: string;
  moneda: string;
  direccion: string;
  ubigeo?: string | null;
  pais: string; // "VE"
  notificar: string; // "0" o "1"
  telefono: string[];
  correo: string[];
}

export interface DescuentoBonificacion {
  descDescuento: string;
  montoDescuento: number;
}

export interface ImpuestoSubtotal {
  codigoTotalImp: string; // "G" (IVA General), "IGTF", etc.
  alicuotaImp: string; // "16.00", "3.00"
  baseImponibleImp: number;
  valorTotalImp: number;
}

export interface FormaPago {
  descripcion: string;
  fecha: string; // dd/mm/aaaa
  forma: string; // Código del catálogo
  monto: number;
  moneda: string; // "VES", "USD", etc.
  tipoCambio: number; // 4 decimales
}

export interface Totales {
  nroItems: number;
  montoGravadoTotal: number;
  montoExentoTotal: number;
  subtotal: number;
  totalAPagar: number;
  totalIVA: number;
  montoTotalConIVA: number;
  montoEnLetras: string;
  totalDescuento: number;
  subtotalAntesDescuento: number;

  listaDescBonificacion?: DescuentoBonificacion[];
  impuestosSubtotal: ImpuestoSubtotal[];
  formasPago: FormaPago[];
}

export interface TotalesOtraMoneda {
  moneda: string; // "USD"
  tipoCambio: number; // 4 decimales

  montoGravadoTotal: number;
  montoExentoTotal: number;
  subtotal: number;
  totalAPagar: number;
  totalIVA: number;
  montoTotalConIVA: number;
  montoEnLetras: string;
  totalDescuento: number;

  impuestosSubtotal: ImpuestoSubtotal[];
}

export interface Orden {
  numero: string;
  correo: string[];
}

export interface Encabezado {
  identificacionDocumento: IdentificacionDocumento;
  vendedor: Vendedor;
  comprador: Comprador;
  sujetoRetenido?: any | null;
  tercero?: any | null;
  totales: Totales;
  totalesOtraMoneda: TotalesOtraMoneda;
  totalesRetencion?: any | null;
  orden: Orden;
}

export interface DetalleItem {
  numeroLinea: string;
  codigoCIIU?: string | null;
  codigoPLU: string; // Código del producto
  indicadorBienoServicio: string; // "1" = Bien, "2" = Servicio
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;

  precioUnitarioDescuento?: number;
  montoBonificacion?: number;
  descripBonificacion?: string;
  descuentoMonto?: number;
  recargoMonto?: number;

  precioItem: number;
  codigoImpuesto: string; // Código IVA
  tasaIVA: number; // 16.00
  valorIVA: number;
  valorTotalItem: number;

  infoAdicionalItem?: any | null;
  listaItemOTI?: any | null;
}

export interface InfoAdicional {
  campo: string;
  valor: string;
}

export interface DocumentoElectronico {
  encabezado: Encabezado;
  detallesItems: DetalleItem[];
  detallesRetencion?: any | null;
  viajes?: any | null;
  infoAdicional?: InfoAdicional[];
  guiaDespacho?: any | null;
}

export interface FacturaElectronica {
  documentoElectronico: DocumentoElectronico;
}

// Tipos auxiliares para el formulario de creación
export interface FacturaFormData {
  // Datos del comprador
  clienteId: string;

  // Datos de la factura
  tipoDocumento: string;
  serie: string;
  sucursal: string;
  tipoDeVenta: string;
  tipoDePago: string;
  fechaEmision: Date;
  fechaVencimiento: Date;

  // Vendedor
  vendedorCodigo: string;
  vendedorNombre: string;

  // Items
  items: ItemFactura[];

  // Formas de pago
  formasPago: FormaPagoInput[];

  // Observaciones
  observaciones?: string;
}

export interface ItemFactura {
  codigoPLU: string;
  descripcion: string;
  indicadorBienoServicio: string; // "1" o "2"
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  tasaIVA: number;
  codigoImpuesto: string;
  descuentoMonto?: number;
  descripBonificacion?: string;
  montoBonificacion?: number;
}

export interface FormaPagoInput {
  descripcion: string;
  forma: string;
  monto: number;
  moneda: string;
  tipoCambio?: number;
}

// Estados de factura
export type EstadoFactura = 'borrador' | 'emitida' | 'anulada' | 'pagada';

// Tipo de documento
export type TipoDocumento = '01' | '02' | '03' | '04'; // 01=Factura, 02=Nota Débito, 03=Nota Crédito, 04=Otro
