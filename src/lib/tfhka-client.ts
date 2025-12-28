// =====================================================
// TFHKA CLIENT - Integración Real con SENIAT
// =====================================================
// Cliente para comunicación con TFHKA (Tax and Fiscal Control)
// Maneja autenticación, envío de documentos y consulta de estados

import { logger } from './logger';

// =====================================================
// TIPOS DE DATOS TFHKA
// =====================================================

export interface TfhkaAuthRequest {
  usuario: string;
  clave: string;
  rif_emisor: string;
  ambiente: 'produccion' | 'homologacion' | 'pruebas';
}

export interface TfhkaAuthResponse {
  success: boolean;
  token?: string;
  expira_en?: number; // segundos
  mensaje?: string;
  codigo_error?: string;
  timestamp?: string;
}

export interface TfhkaDocumentSubmission {
  documento_electronico: any; // JSON del documento fiscal
  token_autenticacion: string;
  tipo_operacion: 'emision' | 'anulacion' | 'consulta';
  numero_control?: string;
  serie?: string;
  numero_documento?: string;
}

export interface TfhkaDocumentResponse {
  success: boolean;
  numero_control?: string;
  codigo_qr?: string;
  url_verificacion?: string;
  estado_documento?: 'procesado' | 'rechazado' | 'pendiente' | 'anulado';
  mensaje?: string;
  errores?: Array<{
    campo: string;
    descripcion: string;
    codigo: string;
  }>;
  timestamp?: string;
}

export interface TfhkaStatusRequest {
  numero_control?: string;
  serie?: string;
  numero_documento?: string;
  rif_emisor: string;
  token_autenticacion: string;
}

export interface TfhkaStatusResponse {
  success: boolean;
  documento?: {
    numero_control: string;
    serie: string;
    numero_documento: string;
    estado: 'procesado' | 'rechazado' | 'pendiente' | 'anulado';
    fecha_procesamiento?: string;
    fecha_anulacion?: string;
    motivo_rechazo?: string;
    url_verificacion?: string;
    codigo_qr?: string;
  };
  mensaje?: string;
  codigo_error?: string;
  timestamp?: string;
}

// =====================================================
// CONFIGURACIÓN TFHKA
// =====================================================

interface TfhkaConfig {
  baseUrl: string;
  ambiente: 'produccion' | 'homologacion' | 'pruebas';
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

const TFHKA_CONFIG: Record<'produccion' | 'homologacion' | 'pruebas', TfhkaConfig> = {
  produccion: {
    baseUrl: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api',
    ambiente: 'produccion',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000
  },
  homologacion: {
    baseUrl: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api/staging',
    ambiente: 'homologacion',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000
  },
  pruebas: {
    baseUrl: 'https://contribuyente.seniat.gob.ve/getdedocumentoset/api/test',
    ambiente: 'pruebas',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000
  }
};

// =====================================================
// CLIENTE TFHKA PRINCIPAL
// =====================================================

export class TfhkaClient {
  private config: TfhkaConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(ambiente: 'produccion' | 'homologacion' | 'pruebas' = 'pruebas') {
    this.config = TFHKA_CONFIG[ambiente];
    logger.info('tfhka', 'init', 'TFHKA Client initialized', { ambiente });
  }

  // =====================================================
  // AUTENTICACIÓN
  // =====================================================

  async authenticate(credentials: TfhkaAuthRequest): Promise<TfhkaAuthResponse> {
    logger.info('tfhka', 'auth', 'Starting TFHKA authentication', {
      usuario: credentials.usuario,
      rif_emisor: credentials.rif_emisor,
      ambiente: credentials.ambiente
    });

    try {
      const authPayload = {
        usuario: credentials.usuario,
        clave: credentials.clave,
        rif_emisor: credentials.rif_emisor,
        timestamp: new Date().toISOString()
      };

      const response = await this.makeRequest('/auth/login', 'POST', authPayload);

      if (response.success && response.token) {
        this.authToken = response.token;
        this.tokenExpiry = new Date(Date.now() + (response.expira_en || 3600) * 1000);

        logger.info('tfhka', 'auth', 'Authentication successful', {
          token_expires: this.tokenExpiry,
          usuario: credentials.usuario
        });

        return {
          success: true,
          token: response.token,
          expira_en: response.expira_en,
          mensaje: 'Autenticación exitosa',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'auth', 'Authentication failed', response);
        return {
          success: false,
          mensaje: response.mensaje || 'Error de autenticación',
          codigo_error: response.codigo_error || 'AUTH_FAILED',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'auth', 'Authentication error', error);
      return {
        success: false,
        mensaje: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        codigo_error: 'CONNECTION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // ENVÍO DE DOCUMENTOS FISCALES
  // =====================================================

  async submitDocument(submission: TfhkaDocumentSubmission): Promise<TfhkaDocumentResponse> {
    logger.info('tfhka', 'submit', 'Submitting fiscal document', {
      tipo_operacion: submission.tipo_operacion,
      serie: submission.serie,
      numero_documento: submission.numero_documento
    });

    // Verificar autenticación
    if (!this.isAuthenticated()) {
      return {
        success: false,
        mensaje: 'Token de autenticación requerido o expirado',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const payload = {
        documento_electronico: submission.documento_electronico,
        tipo_operacion: submission.tipo_operacion,
        numero_control: submission.numero_control,
        serie: submission.serie,
        numero_documento: submission.numero_documento,
        timestamp: new Date().toISOString()
      };

      const response = await this.makeRequest(
        '/documentos/enviar',
        'POST',
        payload,
        {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      );

      if (response.success) {
        logger.info('tfhka', 'submit', 'Document submitted successfully', {
          numero_control: response.numero_control,
          estado: response.estado_documento
        });

        return {
          success: true,
          numero_control: response.numero_control,
          codigo_qr: response.codigo_qr,
          url_verificacion: response.url_verificacion,
          estado_documento: response.estado_documento || 'pendiente',
          mensaje: 'Documento enviado exitosamente',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'submit', 'Document submission failed', response);
        return {
          success: false,
          mensaje: response.mensaje || 'Error al enviar documento',
          errores: response.errores || [],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'submit', 'Document submission error', error);
      return {
        success: false,
        mensaje: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // CONSULTA DE ESTADO DE DOCUMENTOS
  // =====================================================

  async getDocumentStatus(request: TfhkaStatusRequest): Promise<TfhkaStatusResponse> {
    logger.info('tfhka', 'status', 'Querying document status', {
      numero_control: request.numero_control,
      serie: request.serie,
      numero_documento: request.numero_documento
    });

    // Verificar autenticación
    if (!this.isAuthenticated()) {
      return {
        success: false,
        mensaje: 'Token de autenticación requerido o expirado',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const queryParams = new URLSearchParams({
        numero_control: request.numero_control || '',
        serie: request.serie || '',
        numero_documento: request.numero_documento || '',
        rif_emisor: request.rif_emisor
      });

      const response = await this.makeRequest(
        `/documentos/estado?${queryParams}`,
        'GET',
        null,
        {
          'Authorization': `Bearer ${this.authToken}`
        }
      );

      if (response.success && response.documento) {
        logger.info('tfhka', 'status', 'Document status retrieved', {
          estado: response.documento.estado,
          numero_control: response.documento.numero_control
        });

        return {
          success: true,
          documento: response.documento,
          mensaje: 'Estado consultado exitosamente',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'status', 'Status query failed', response);
        return {
          success: false,
          mensaje: response.mensaje || 'Error al consultar estado',
          codigo_error: response.codigo_error || 'QUERY_FAILED',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'status', 'Status query error', error);
      return {
        success: false,
        mensaje: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        codigo_error: 'CONNECTION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private isAuthenticated(): boolean {
    return !!(this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry);
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SistemaFacturacion/1.0',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    // Implementar reintentos
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        logger.debug('tfhka', 'request', 'Making HTTP request', {
          url,
          method,
          attempt,
          maxAttempts: this.config.retryAttempts
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        logger.debug('tfhka', 'request', 'Request successful', {
          url,
          status: response.status,
          attempt
        });

        return result;

      } catch (error) {
        logger.warn('tfhka', 'request', 'Request attempt failed', {
          url,
          attempt,
          maxAttempts: this.config.retryAttempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempt === this.config.retryAttempts) {
          throw error;
        }

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    throw new Error('All retry attempts failed');
  }

  // =====================================================
  // MÉTODOS DE UTILIDAD
  // =====================================================

  getAuthStatus(): { authenticated: boolean; expiresAt?: Date; timeRemaining?: number } {
    const authenticated = this.isAuthenticated();
    return {
      authenticated,
      expiresAt: this.tokenExpiry || undefined,
      timeRemaining: this.tokenExpiry ? Math.max(0, this.tokenExpiry.getTime() - Date.now()) : undefined
    };
  }

  clearAuthentication(): void {
    this.authToken = null;
    this.tokenExpiry = null;
    logger.info('tfhka', 'auth', 'Authentication cleared');
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

let tfhkaClientInstance: TfhkaClient | null = null;

export function getTfhkaClient(ambiente?: 'produccion' | 'homologacion' | 'pruebas'): TfhkaClient {
  if (!tfhkaClientInstance || (ambiente && tfhkaClientInstance.getAuthStatus())) {
    tfhkaClientInstance = new TfhkaClient(ambiente);
  }
  return tfhkaClientInstance;
}

export default TfhkaClient;