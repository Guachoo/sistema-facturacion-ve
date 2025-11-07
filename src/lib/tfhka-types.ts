// =====================================================
// TFHKA TYPES - Tipos para JSONs SENIAT
// =====================================================
// Definiciones de tipos basadas en especificaciones oficiales SENIAT
// Para AUTENTICACION.JSON y ESTADO_DOCUMENTO.JSON

// =====================================================
// AUTENTICACION.JSON - Estructura oficial SENIAT
// =====================================================

export interface AutenticacionRequest {
  /**
   * Estructura para autenticación con SENIAT TFHKA
   * Basado en especificaciones oficiales venezolanas
   */
  usuario: string;              // Usuario SENIAT del contribuyente
  clave: string;               // Contraseña cifrada
  rif_emisor: string;          // RIF del emisor (J-12345678-9)
  ambiente: 'produccion' | 'homologacion' | 'pruebas';
  aplicacion: {
    nombre: string;            // Nombre del sistema
    version: string;           // Versión del sistema
    fabricante: string;        // Empresa desarrolladora
  };
  timestamp: string;           // ISO 8601 timestamp
  dispositivo?: {
    ip: string;                // IP del dispositivo
    mac?: string;              // MAC address (opcional)
    identificador: string;     // ID único del dispositivo
  };
}

export interface AutenticacionResponse {
  /**
   * Respuesta de autenticación SENIAT
   */
  exito: boolean;
  token?: string;               // JWT token para operaciones
  expira_en?: number;           // Segundos hasta expiración
  tipo_token?: 'Bearer';
  permisos?: {
    emitir_documentos: boolean;
    consultar_estados: boolean;
    anular_documentos: boolean;
    generar_reportes: boolean;
  };
  usuario_info?: {
    nombre: string;
    rif: string;
    razon_social: string;
    contribuyente_especial: boolean;
  };
  mensaje?: string;
  codigo_error?: string;
  errores?: Array<{
    campo: string;
    codigo: string;
    descripcion: string;
  }>;
  timestamp: string;
}

// =====================================================
// ESTADO_DOCUMENTO.JSON - Consulta de estados
// =====================================================

export interface EstadoDocumentoRequest {
  /**
   * Request para consultar estado de documento fiscal
   */
  // Identificación del documento
  numero_control?: string;      // Número de control SENIAT
  serie?: string;              // Serie del documento (A, B, C, etc.)
  numero_documento?: string;    // Número correlativo
  tipo_documento?: '01' | '02' | '03' | '04' | '05'; // Tipo según SENIAT

  // Identificación del emisor
  rif_emisor: string;          // RIF del emisor

  // Autenticación
  token: string;               // Token de autenticación

  // Filtros opcionales
  fecha_desde?: string;        // Formato YYYY-MM-DD
  fecha_hasta?: string;        // Formato YYYY-MM-DD
  estado_filtro?: EstadoDocumento[];

  // Paginación
  pagina?: number;
  limite?: number;

  timestamp: string;
}

export type EstadoDocumento =
  | 'pendiente'           // En proceso de validación
  | 'procesado'          // Validado y aceptado por SENIAT
  | 'rechazado'          // Rechazado por errores
  | 'anulado'            // Anulado por el emisor
  | 'vencido'            // Venció tiempo de procesamiento
  | 'suspendido';        // Suspendido por auditoría

export interface DocumentoEstado {
  // Identificación
  numero_control: string;
  serie: string;
  numero_documento: string;
  tipo_documento: string;

  // Estado actual
  estado: EstadoDocumento;
  fecha_emision: string;
  fecha_procesamiento?: string;
  fecha_vencimiento?: string;
  fecha_anulacion?: string;

  // Información fiscal
  monto_total: number;
  moneda: 'VES' | 'USD';
  tasa_cambio?: number;

  // URLs y códigos
  url_verificacion?: string;
  codigo_qr?: string;
  hash_documento?: string;

  // Detalles del estado
  motivo_rechazo?: string;
  codigo_rechazo?: string;
  motivo_anulacion?: string;
  observaciones?: string;

  // Auditoría
  procesado_por?: string;
  ip_origen?: string;

  // Errores de validación
  errores_validacion?: Array<{
    campo: string;
    codigo: string;
    descripcion: string;
    severidad: 'error' | 'advertencia' | 'informacion';
  }>;
}

export interface EstadoDocumentoResponse {
  /**
   * Respuesta de consulta de estado
   */
  exito: boolean;
  documentos?: DocumentoEstado[];
  total_documentos?: number;
  pagina_actual?: number;
  total_paginas?: number;

  // Estadísticas
  resumen?: {
    pendientes: number;
    procesados: number;
    rechazados: number;
    anulados: number;
    total: number;
  };

  mensaje?: string;
  codigo_error?: string;
  errores?: Array<{
    campo: string;
    codigo: string;
    descripcion: string;
  }>;
  timestamp: string;
}

// =====================================================
// TIPOS COMPLEMENTARIOS
// =====================================================

export interface TfhkaError {
  codigo: string;
  mensaje: string;
  campo?: string;
  valor_recibido?: string;
  valor_esperado?: string;
  documentacion_url?: string;
}

export interface TfhkaOperationResult<T = any> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
  errores?: TfhkaError[];
  timestamp: string;
  tiempo_respuesta?: number; // ms
  request_id?: string;
}

// =====================================================
// ENUMS PARA CÓDIGOS OFICIALES
// =====================================================

export enum CodigoErrorTfhka {
  // Autenticación
  CREDENCIALES_INVALIDAS = 'AUTH_001',
  TOKEN_EXPIRADO = 'AUTH_002',
  USUARIO_BLOQUEADO = 'AUTH_003',
  RIF_NO_AUTORIZADO = 'AUTH_004',

  // Documentos
  DOCUMENTO_NO_ENCONTRADO = 'DOC_001',
  DOCUMENTO_YA_PROCESADO = 'DOC_002',
  DOCUMENTO_ANULADO = 'DOC_003',
  FORMATO_INVALIDO = 'DOC_004',
  NUMERO_CONTROL_DUPLICADO = 'DOC_005',

  // Validaciones fiscales
  RIF_INVALIDO = 'FISCAL_001',
  MONTO_INVALIDO = 'FISCAL_002',
  IVA_INCORRECTO = 'FISCAL_003',
  SERIE_NO_AUTORIZADA = 'FISCAL_004',
  NUMERACION_INCORRECTA = 'FISCAL_005',

  // Sistema
  SERVICIO_NO_DISPONIBLE = 'SYS_001',
  MANTENIMIENTO = 'SYS_002',
  LIMITE_EXCEDIDO = 'SYS_003',
  TIMEOUT = 'SYS_004',

  // Red
  CONNECTION_ERROR = 'NET_001',
  TIMEOUT_ERROR = 'NET_002',
  DNS_ERROR = 'NET_003'
}

export enum TipoAmbiente {
  PRODUCCION = 'produccion',
  HOMOLOGACION = 'homologacion',
  PRUEBAS = 'pruebas'
}

export enum TipoOperacion {
  EMISION = 'emision',
  ANULACION = 'anulacion',
  CONSULTA = 'consulta',
  REENVIO = 'reenvio'
}

// =====================================================
// CONFIGURACIÓN DE AMBIENTES
// =====================================================

export interface TfhkaAmbienteConfig {
  nombre: TipoAmbiente;
  base_url: string;
  auth_endpoint: string;
  documento_endpoint: string;
  estado_endpoint: string;
  timeout_ms: number;
  reintentos: number;
  rate_limit: {
    requests_per_minute: number;
    requests_per_hour: number;
  };
}

export const TFHKA_AMBIENTES: Record<TipoAmbiente, TfhkaAmbienteConfig> = {
  [TipoAmbiente.PRODUCCION]: {
    nombre: TipoAmbiente.PRODUCCION,
    base_url: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api/v1',
    auth_endpoint: '/auth/token',
    documento_endpoint: '/documentos',
    estado_endpoint: '/documentos/estado',
    timeout_ms: 30000,
    reintentos: 3,
    rate_limit: {
      requests_per_minute: 60,
      requests_per_hour: 1000
    }
  },

  [TipoAmbiente.HOMOLOGACION]: {
    nombre: TipoAmbiente.HOMOLOGACION,
    base_url: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api/homologacion/v1',
    auth_endpoint: '/auth/token',
    documento_endpoint: '/documentos',
    estado_endpoint: '/documentos/estado',
    timeout_ms: 45000,
    reintentos: 5,
    rate_limit: {
      requests_per_minute: 30,
      requests_per_hour: 500
    }
  },

  [TipoAmbiente.PRUEBAS]: {
    nombre: TipoAmbiente.PRUEBAS,
    base_url: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api/test/v1',
    auth_endpoint: '/auth/token',
    documento_endpoint: '/documentos',
    estado_endpoint: '/documentos/estado',
    timeout_ms: 60000,
    reintentos: 5,
    rate_limit: {
      requests_per_minute: 100,
      requests_per_hour: 2000
    }
  }
};

// =====================================================
// UTILIDADES DE VALIDACIÓN
// =====================================================

export function validarRifVenezolano(rif: string): boolean {
  const rifPattern = /^[VJGE]-\d{8}-\d$/;
  return rifPattern.test(rif);
}

export function validarNumeroControl(numeroControl: string): boolean {
  // Formato típico: ########-##
  const pattern = /^\d{8}-\d{2}$/;
  return pattern.test(numeroControl);
}

export function validarSerie(serie: string): boolean {
  // Series válidas: A-Z (una sola letra)
  const pattern = /^[A-Z]$/;
  return pattern.test(serie);
}

export function esAmbienteValido(ambiente: string): ambiente is TipoAmbiente {
  return Object.values(TipoAmbiente).includes(ambiente as TipoAmbiente);
}