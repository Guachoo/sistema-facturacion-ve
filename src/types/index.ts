// Core types for the Venezuelan invoice system
export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'contador' | 'vendedor' | 'supervisor' | 'auditor';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Customer {
  id?: string;
  rif: string;
  razonSocial: string;
  nombre?: string;
  domicilio: string;
  telefono?: string;
  email?: string;
  tipoContribuyente: 'especial' | 'ordinario' | 'formal';
  esContribuyenteEspecial?: boolean; // Indica si es contribuyente especial (deprecado: usar tipoContribuyente)
  esAgenteRetencion?: boolean; // Indica si es agente de retención del IVA
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id?: string;
  codigo: string;
  descripcion: string;
  tipo: 'producto' | 'servicio';
  precioBase: number; // Always stored in VES for fiscal calculations
  precioUsd?: number; // USD reference to rescale amounts with the latest BCV rate
  ivaAplica: boolean;
  // Inventory fields
  stockActual?: number;
  stockMinimo?: number;
  stockMaximo?: number;
  costoPromedio?: number;
  ubicacion?: string;
  categoria?: string;
  activo?: boolean;
  // PHASE 2: Fiscal fields for SENIAT compliance
  codigoSeniat?: string; // Official SENIAT product/service code
  categoriaSeniat?: 'bien' | 'servicio' | 'importado' | 'exento';
  clasificacionFiscal?: 'gravado' | 'exento' | 'excluido' | 'no_sujeto'; // Fiscal classification for tax purposes
  unidadMedida?: string; // kg, unidad, litro, etc.
  codigoArancelario?: string; // For imported goods
  origenFiscal?: 'nacional' | 'importado' | 'zona_libre';
  alicuotaIva?: number; // Override default IVA rate for specific items
  exentoIva?: boolean; // Items exempt from IVA
  retencionIslr?: boolean; // Subject to income tax retention
  sujetoRetencionIslr?: boolean; // Subject to ISLR retention
  porcentajeRetencionIslr?: number; // ISLR retention percentage
  codigoActividad?: string; // Economic activity code
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryMovement {
  id?: string;
  itemId: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'merma';
  cantidad: number;
  costoUnitario?: number;
  motivo: string;
  referencia?: string; // invoice ID, purchase order, etc.
  usuarioId: string;
  fecha: string;
  stockAnterior: number;
  stockNuevo: number;
  createdAt?: string;
}

export interface InvoiceLine {
  id: string;
  itemId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number; // VES
  descuento: number; // percentage 0-100
  baseImponible: number; // calculated
  alicuotaIva: number; // IVA rate percentage (0, 8, 16, etc.)
  montoIva: number; // calculated
  total: number; // calculated
  item: Item; // Reference to the full item for tax calculations
}

export interface Payment {
  id?: string; // Unique identifier for payment tracking
  tipo: 'transferencia_ves' | 'usd_cash' | 'zelle' | 'mixto';
  monto: number; // VES
  montoUsd?: number; // Reference only
  aplicaIgtf: boolean;
  montoIgtf?: number;
}

export interface Invoice {
  id?: string;
  numero: string;
  transaction_id?: string; // ✅ NUEVO - ID transaccional estructurado
  numeroControl: string;
  fecha: string;
  fechaVencimiento?: string;
  moneda?: 'VES' | 'USD';
  emisor: {
    nombre: string;
    rif: string;
    domicilio: string;
  };
  receptor: Customer;
  lineas: InvoiceLine[];
  pagos: Payment[];
  subtotal: number; // VES
  baseImponible: number; // VES - Base gravable para IVA
  montoIva: number; // VES
  montoIgtf: number; // VES
  montoExento?: number; // VES - Monto exento de IVA
  descuento?: number; // VES - Descuentos aplicados
  total: number; // VES
  totalUsdReferencia: number; // Reference only
  tasaBcv: number;
  fechaTasaBcv: string;
  canal: 'digital' | 'maquina';
  estado: 'emitida' | 'nota_credito' | 'nota_debito' | 'anulada';
  facturaAfectadaId?: string;
  facturaAfectadaNumero?: string;
  tipoNota?: 'credito' | 'debito';
  motivoNota?: string;
  notas?: string; // Notas adicionales para la factura
  createdAt?: string;
  updatedAt?: string;
  fiscalTemplate?: any; // Venezuelan fiscal document JSON template
}

export interface BcvRate {
  date: string;
  rate: number;
  source: string;
  lastUpdate?: string;
}

export interface SalesBookEntry {
  fecha: string;
  numeroFactura: string;
  cliente: string;
  baseImponible: number;
  montoIva: number;
  exento: number;
  total: number;
  canal: 'digital' | 'maquina';
}

export interface IgtfReport {
  periodo: string;
  formaPago: string;
  montoBase: number;
  montoIgtf: number;
  numeroOperaciones: number;
}

export interface CompanySettings {
  razonSocial: string;
  rif: string;
  domicilioFiscal: string;
  telefonos: string;
  email: string;
  logo?: string;
  condicionesVenta: string;
}

export interface ControlNumberBatch {
  id: string;
  rangeFrom: number;
  rangeTo: number;
  active: boolean;
  used: number;
  remaining: number;
}

// TFHKA API Types
export interface TfhkaCredentials {
  username: string;
  password: string;
  client_id?: string;
  client_secret?: string;
}

export interface TfhkaAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface TfhkaDocument {
  tipo_documento: 'factura' | 'nota_credito' | 'nota_debito';
  numero_documento: string;
  numero_control: string;
  fecha_emision: string;
  emisor: {
    rif: string;
    razon_social: string;
    direccion: string;
  };
  receptor: {
    rif: string;
    razon_social: string;
    direccion: string;
  };
  detalles: TfhkaDocumentItem[];
  subtotal: number;
  monto_iva: number;
  monto_igtf: number;
  total: number;
  moneda: 'VES' | 'USD';
  tasa_cambio: number;
}

export interface TfhkaDocumentItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  base_imponible: number;
  aliquota_iva: number;
  monto_iva: number;
  total: number;
}

export interface TfhkaDocumentResponse {
  id: string;
  numero_control: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  qr_code?: string;
  pdf_url?: string;
  xml_url?: string;
  errors?: string[];
  warnings?: string[];
}

export interface TfhkaStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'voided';
  seniat_status?: string;
  last_updated: string;
  errors?: string[];
}

export interface TfhkaVoidRequest {
  document_id: string;
  reason: string;
  void_date?: string;
}

export interface TfhkaEmailRequest {
  document_id: string;
  recipient_email: string;
  subject?: string;
  message?: string;
  include_pdf: boolean;
  include_xml: boolean;
}

// Enhanced Fiscal Document Types (extends existing Invoice)
export interface FiscalDocument extends Omit<Invoice, 'id' | 'numero' | 'numeroControl' | 'estado'> {
  id: string;
  document_type: 'factura' | 'nota_credito' | 'nota_debito';
  document_number: string;  // maps to 'numero'
  control_number: string;   // maps to 'numeroControl'
  serie: string;
  status: 'draft' | 'emitted' | 'sent' | 'voided';  // enhanced version of 'estado'
  customer_id: string;
  currency: 'VES' | 'USD';
  exchange_rate: number;    // maps to 'tasaBcv'
  issue_date: string;       // maps to 'fecha'
  due_date?: string;
  void_reason?: string;
  void_date?: string;
  tfhka_document_id?: string;
  tfhka_status?: string;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocumentItem {
  id: string;
  document_id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  total_amount: number;
  created_at: string;
}

export interface FiscalSeries {
  id: string;
  company_id: string;
  serie: string;
  document_type: 'factura' | 'nota_credito' | 'nota_debito';
  current_number: number;
  max_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TfhkaLog {
  id: string;
  document_id: string;
  action: 'emit' | 'status_check' | 'void' | 'send_email';
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  status: 'success' | 'error';
  error_message?: string;
  created_at: string;
}

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  url?: string;
  method?: string;
  status?: number;
}

// =====================================================
// FASE 6: SISTEMA DE NOTIFICACIONES EXPANDIDO
// =====================================================

// Tipos para ENVIO_DE_CORREO.JSON
export interface EnvioCorreoRequest {
  documento_id: string;
  transaction_id: string;
  destinatario: {
    email: string;
    nombre?: string;
    tipo: 'cliente' | 'emisor' | 'contador' | 'auditoria';
  };
  contenido: {
    asunto: string;
    mensaje_personalizado?: string;
    plantilla: 'factura' | 'nota_credito' | 'nota_debito' | 'anulacion' | 'retencion';
    idioma: 'es' | 'en';
  };
  adjuntos: {
    incluir_pdf: boolean;
    incluir_xml: boolean;
    incluir_json: boolean;
    incluir_qr?: boolean;
  };
  configuracion: {
    prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
    solicitar_confirmacion: boolean;
    envio_programado?: string; // ISO timestamp
    intentos_maximos: number;
  };
  metadatos?: {
    campana_id?: string;
    grupo_envio?: string;
    referencia_externa?: string;
  };
}

export interface EnvioCorreoResponse {
  success: boolean;
  envio_id: string;
  mensaje: string;
  estado: 'enviado' | 'programado' | 'fallido' | 'pendiente';
  timestamp: string;
  detalles?: {
    proveedor_email: string;
    id_mensaje_proveedor?: string;
    tamano_adjuntos_mb?: number;
    tiempo_envio_ms?: number;
  };
  errores?: Array<{
    codigo: string;
    descripcion: string;
    campo_afectado?: string;
  }>;
}

// Tipos para RASTREO_DE_CORREO.JSON
export interface RastreoCorreoRequest {
  envio_id?: string;
  transaction_id?: string;
  email_destinatario?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estados?: EmailStatus[];
  limite?: number;
  offset?: number;
}

export type EmailStatus =
  | 'enviado'
  | 'entregado'
  | 'leido'
  | 'rebotado'
  | 'spam'
  | 'fallido'
  | 'programado'
  | 'cancelado';

export interface HistorialCorreo {
  envio_id: string;
  documento_id: string;
  transaction_id: string;
  destinatario_email: string;
  destinatario_nombre?: string;
  asunto: string;
  estado_actual: EmailStatus;
  fecha_envio: string;
  fecha_entrega?: string;
  fecha_lectura?: string;
  fecha_rebote?: string;
  intentos_realizados: number;
  proveedor_email: string;
  eventos: EventoCorreo[];
  metadatos_envio: {
    tamano_total_mb: number;
    adjuntos_incluidos: string[];
    ip_origen: string;
    user_agent?: string;
  };
}

export interface EventoCorreo {
  id: string;
  tipo_evento: 'enviado' | 'entregado' | 'leido' | 'rebotado' | 'click' | 'descarga_adjunto';
  timestamp: string;
  descripcion: string;
  datos_adicionales?: {
    ip_receptor?: string;
    ubicacion_geografica?: string;
    dispositivo?: string;
    proveedor_email_receptor?: string;
    codigo_error?: string;
    adjunto_descargado?: string;
  };
}

export interface RastreoCorreoResponse {
  success: boolean;
  historial: HistorialCorreo[];
  resumen: {
    total_envios: number;
    enviados: number;
    entregados: number;
    leidos: number;
    rebotados: number;
    fallidos: number;
    tasa_entrega: number;
    tasa_lectura: number;
  };
  timestamp: string;
}

// Sistema de Alertas Fiscales
export interface AlertaFiscal {
  id: string;
  tipo: AlertType;
  severidad: 'info' | 'warning' | 'error' | 'critical';
  titulo: string;
  descripcion: string;
  documento_afectado?: {
    transaction_id: string;
    numero_documento: string;
    tipo_documento: string;
  };
  fecha_creacion: string;
  fecha_resolucion?: string;
  estado: 'activa' | 'resuelta' | 'ignorada' | 'escalada';
  acciones_sugeridas: string[];
  resuelto_por?: string;
  notificado_a: string[]; // IDs de usuarios notificados
  canales_notificacion: ('email' | 'sms' | 'push' | 'dashboard')[];
}

export type AlertType =
  | 'documento_rechazado_seniat'
  | 'numero_control_duplicado'
  | 'tasa_bcv_obsoleta'
  | 'limite_facturas_excedido'
  | 'backup_fallido'
  | 'sincronizacion_tfhka_error'
  | 'validacion_fiscal_error'
  | 'cliente_rif_invalido'
  | 'numeracion_inconsistente'
  | 'sistema_fuera_linea';

// Dashboard en Tiempo Real
export interface EstadoSistemaRealTime {
  timestamp: string;
  seniat: {
    estado: 'online' | 'offline' | 'lento' | 'mantenimiento';
    tiempo_respuesta_ms: number;
    documentos_pendientes: number;
    documentos_procesados_hoy: number;
    ultima_sincronizacion: string;
  };
  tfhka: {
    estado: 'conectado' | 'desconectado' | 'error';
    documentos_enviados_hoy: number;
    documentos_confirmados_hoy: number;
    tiempo_respuesta_promedio_ms: number;
  };
  sistema_local: {
    documentos_emitidos_hoy: number;
    emails_enviados_hoy: number;
    alertas_activas: number;
    usuarios_conectados: number;
    ultimo_backup: string;
    espacio_disco_usado_porcentaje: number;
  };
  metricas_rendimiento: {
    tiempo_emision_promedio_ms: number;
    tasa_exito_email: number;
    tasa_exito_seniat: number;
    documentos_por_minuto: number;
  };
}

export interface NotificacionRealTime {
  id: string;
  tipo: 'documento_procesado' | 'email_enviado' | 'alerta_fiscal' | 'sistema_status';
  titulo: string;
  mensaje: string;
  datos: any;
  timestamp: string;
  dirigida_a?: string[]; // IDs de usuarios específicos, si no está presente es para todos
  expira_en?: string; // ISO timestamp
  acciones?: Array<{
    id: string;
    etiqueta: string;
    tipo: 'button' | 'link';
    accion: string; // URL o función
  }>;
}
