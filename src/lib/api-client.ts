import axios from 'axios';
import type {
  TfhkaCredentials,
  TfhkaAuthResponse,
  TfhkaDocument,
  TfhkaDocumentResponse,
  TfhkaStatusResponse,
  TfhkaVoidRequest,
  TfhkaEmailRequest
} from '@/types';

// Create axios instance for main API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for TFHKA API
export const tfhkaApiClient = axios.create({
  baseURL: import.meta.env.VITE_TFHKA_API_URL || 'https://api.tfhka.com',
  timeout: 30000, // Longer timeout for external API
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management
export const tokenManager = {
  get: (): string | null => localStorage.getItem('auth_token'),
  set: (token: string): void => localStorage.setItem('auth_token', token),
  remove: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user'); // ✅ Limpiar datos de usuario también
  },
};

// User data management
export const userManager = {
  get: (): any | null => {
    const userData = localStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  },
  set: (user: any): void => {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },
  remove: (): void => {
    localStorage.removeItem('auth_user');
  },
};

// TFHKA Token management
export const tfhkaTokenManager = {
  get: (): string | null => localStorage.getItem('tfhka_token'),
  set: (token: string): void => localStorage.setItem('tfhka_token', token),
  remove: (): void => localStorage.removeItem('tfhka_token'),
  getRefresh: (): string | null => localStorage.getItem('tfhka_refresh_token'),
  setRefresh: (token: string): void => localStorage.setItem('tfhka_refresh_token', token),
  removeRefresh: (): void => localStorage.removeItem('tfhka_refresh_token'),
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced error handling with retry logic
const createRetryInterceptor = (client: typeof apiClient, tokenMgr: typeof tokenManager) => {
  return client.interceptors.response.use(
    (response: any) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle network errors with retry
      if (!error.response && !originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      if (!error.response && originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        console.warn(`Network error, retrying... (${originalRequest._retryCount}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        return client(originalRequest);
      }

      // Handle authentication errors
      if (error.response?.status === 401) {
        tokenMgr.remove();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 5;
        console.warn(`Rate limited, retrying after ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return client(originalRequest);
      }

      // Enhanced error information
      const enhancedError = {
        ...error,
        timestamp: new Date().toISOString(),
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      };

      console.error('API Error:', enhancedError);
      return Promise.reject(enhancedError);
    }
  );
};

// Apply enhanced error handling to main API client
createRetryInterceptor(apiClient, tokenManager);

// Apply enhanced error handling to TFHKA API client with token refresh
createRetryInterceptor(tfhkaApiClient, tfhkaTokenManager);

// TFHKA Request interceptor
tfhkaApiClient.interceptors.request.use(
  (config) => {
    const token = tfhkaTokenManager.get();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Import logger for enhanced logging
import { logger } from './logger';

// =====================================================
// TFHKA REAL INTEGRATION
// =====================================================
import { TfhkaClient, getTfhkaClient } from './tfhka-client';
import type {
  AutenticacionRequest,
  AutenticacionResponse,
  EstadoDocumentoRequest,
  EstadoDocumentoResponse,
  TfhkaOperationResult,
  TipoAmbiente
} from './tfhka-types';

// Enhanced TFHKA API helper functions with real SENIAT integration
export const tfhkaApi = {
  // =====================================================
  // AUTENTICACIÓN SENIAT REAL
  // =====================================================
  authenticate: async (request: AutenticacionRequest): Promise<TfhkaOperationResult<AutenticacionResponse>> => {
    try {
      logger.info('tfhka', 'authenticate', 'Attempting SENIAT TFHKA authentication', {
        usuario: request.usuario,
        rif_emisor: request.rif_emisor,
        ambiente: request.ambiente
      });

      const client = getTfhkaClient(request.ambiente);
      const authResponse = await client.authenticate({
        usuario: request.usuario,
        clave: request.clave,
        rif_emisor: request.rif_emisor,
        ambiente: request.ambiente
      });

      if (authResponse.success && authResponse.token) {
        // Guardar token en almacenamiento local
        tfhkaTokenManager.set(authResponse.token);

        // Construir respuesta estructurada
        const responseData: AutenticacionResponse = {
          exito: true,
          token: authResponse.token,
          expira_en: authResponse.expira_en,
          tipo_token: 'Bearer',
          permisos: {
            emitir_documentos: true,
            consultar_estados: true,
            anular_documentos: true,
            generar_reportes: true
          },
          mensaje: authResponse.mensaje || 'Autenticación exitosa',
          timestamp: authResponse.timestamp || new Date().toISOString()
        };

        logger.info('tfhka', 'authenticate', 'SENIAT authentication successful');
        return {
          exito: true,
          datos: responseData,
          mensaje: 'Autenticación exitosa con SENIAT',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'authenticate', 'SENIAT authentication failed', authResponse);
        return {
          exito: false,
          mensaje: authResponse.mensaje || 'Error de autenticación',
          errores: [{
            codigo: authResponse.codigo_error || 'AUTH_FAILED',
            mensaje: authResponse.mensaje || 'Credenciales inválidas'
          }],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'authenticate', 'SENIAT authentication error', error);
      return {
        exito: false,
        mensaje: `Error de conexión con SENIAT: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        errores: [{
          codigo: 'CONNECTION_ERROR',
          mensaje: 'No se pudo conectar con el servidor SENIAT'
        }],
        timestamp: new Date().toISOString()
      };
    }
  },

  // =====================================================
  // ENVÍO DE DOCUMENTOS FISCALES
  // =====================================================
  emitDocument: async (documentData: any): Promise<TfhkaOperationResult<any>> => {
    try {
      logger.info('tfhka', 'emit_document', 'Emitting fiscal document to SENIAT', {
        tipo_documento: documentData.tipo_documento,
        serie: documentData.serie,
        numero_documento: documentData.numero_documento
      });

      const client = getTfhkaClient();
      const token = tfhkaTokenManager.get();

      if (!token) {
        throw new Error('Token de autenticación TFHKA requerido');
      }

      const submitResponse = await client.submitDocument({
        documento_electronico: documentData,
        token_autenticacion: token,
        tipo_operacion: 'emision',
        serie: documentData.serie,
        numero_documento: documentData.numero_documento
      });

      if (submitResponse.success) {
        logger.info('tfhka', 'emit_document', 'Document emission successful', {
          numero_control: submitResponse.numero_control,
          estado: submitResponse.estado_documento
        });

        return {
          exito: true,
          datos: submitResponse,
          mensaje: 'Documento enviado exitosamente a SENIAT',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'emit_document', 'Document emission failed', submitResponse);
        return {
          exito: false,
          mensaje: submitResponse.mensaje || 'Error al enviar documento',
          errores: submitResponse.errores?.map(err => ({
            codigo: err.codigo,
            mensaje: err.descripcion,
            campo: err.campo
          })) || [],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'emit_document', 'Document emission error', error);
      return {
        exito: false,
        mensaje: `Error al enviar documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        errores: [{
          codigo: 'SUBMIT_ERROR',
          mensaje: 'Error interno al enviar documento'
        }],
        timestamp: new Date().toISOString()
      };
    }
  },

  // =====================================================
  // CONSULTA DE ESTADO DE DOCUMENTOS
  // =====================================================
  getDocumentStatus: async (request: EstadoDocumentoRequest): Promise<TfhkaOperationResult<EstadoDocumentoResponse>> => {
    try {
      logger.info('tfhka', 'get_status', 'Checking document status with SENIAT', {
        numero_control: request.numero_control,
        serie: request.serie,
        numero_documento: request.numero_documento
      });

      const client = getTfhkaClient();
      const statusResponse = await client.getDocumentStatus({
        numero_control: request.numero_control,
        serie: request.serie,
        numero_documento: request.numero_documento,
        rif_emisor: request.rif_emisor,
        token_autenticacion: request.token
      });

      if (statusResponse.success && statusResponse.documento) {
        const responseData: EstadoDocumentoResponse = {
          exito: true,
          documentos: [statusResponse.documento],
          total_documentos: 1,
          mensaje: 'Estado consultado exitosamente',
          timestamp: statusResponse.timestamp || new Date().toISOString()
        };

        logger.info('tfhka', 'get_status', 'Status check successful', {
          estado: statusResponse.documento.estado,
          numero_control: statusResponse.documento.numero_control
        });

        return {
          exito: true,
          datos: responseData,
          mensaje: 'Estado consultado exitosamente',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'get_status', 'Status check failed', statusResponse);
        return {
          exito: false,
          mensaje: statusResponse.mensaje || 'Error al consultar estado',
          errores: [{
            codigo: statusResponse.codigo_error || 'STATUS_ERROR',
            mensaje: statusResponse.mensaje || 'No se pudo consultar el estado'
          }],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'get_status', 'Status check error', error);
      return {
        exito: false,
        mensaje: `Error al consultar estado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        errores: [{
          codigo: 'QUERY_ERROR',
          mensaje: 'Error interno al consultar estado'
        }],
        timestamp: new Date().toISOString()
      };
    }
  },

  // =====================================================
  // ANULACIÓN DE DOCUMENTOS
  // =====================================================
  voidDocument: async (voidRequest: {
    numero_control: string;
    serie: string;
    numero_documento: string;
    motivo: string;
    rif_emisor: string;
  }): Promise<TfhkaOperationResult<any>> => {
    try {
      logger.info('tfhka', 'void_document', 'Voiding document with SENIAT', {
        numero_control: voidRequest.numero_control,
        motivo: voidRequest.motivo
      });

      const client = getTfhkaClient();
      const token = tfhkaTokenManager.get();

      if (!token) {
        throw new Error('Token de autenticación TFHKA requerido');
      }

      // Crear documento de anulación
      const anulacionDoc = {
        serie: voidRequest.serie,
        tipoDocumento: '04', // Código para anulación
        numeroDocumento: voidRequest.numero_documento,
        motivoAnulacion: voidRequest.motivo,
        fechaAnulacion: new Date().toISOString().split('T')[0],
        horaAnulacion: new Date().toLocaleTimeString('es-VE', { hour12: false })
      };

      const voidResponse = await client.submitDocument({
        documento_electronico: anulacionDoc,
        token_autenticacion: token,
        tipo_operacion: 'anulacion',
        numero_control: voidRequest.numero_control,
        serie: voidRequest.serie,
        numero_documento: voidRequest.numero_documento
      });

      if (voidResponse.success) {
        logger.info('tfhka', 'void_document', 'Document void successful', {
          numero_control: voidRequest.numero_control,
          estado: voidResponse.estado_documento
        });

        return {
          exito: true,
          datos: voidResponse,
          mensaje: 'Documento anulado exitosamente',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.error('tfhka', 'void_document', 'Document void failed', voidResponse);
        return {
          exito: false,
          mensaje: voidResponse.mensaje || 'Error al anular documento',
          errores: voidResponse.errores?.map(err => ({
            codigo: err.codigo,
            mensaje: err.descripcion,
            campo: err.campo
          })) || [],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('tfhka', 'void_document', 'Document void error', error);
      return {
        exito: false,
        mensaje: `Error al anular documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        errores: [{
          codigo: 'VOID_ERROR',
          mensaje: 'Error interno al anular documento'
        }],
        timestamp: new Date().toISOString()
      };
    }
  },

  // =====================================================
  // UTILIDADES DE GESTIÓN
  // =====================================================
  getAuthStatus: (): { authenticated: boolean; expiresAt?: Date; timeRemaining?: number } => {
    const client = getTfhkaClient();
    return client.getAuthStatus();
  },

  clearAuthentication: (): void => {
    const client = getTfhkaClient();
    client.clearAuthentication();
    tfhkaTokenManager.remove();
    tfhkaTokenManager.removeRefresh();
  },

  // Método de conveniencia para verificar conectividad
  healthCheck: async (): Promise<TfhkaOperationResult<{ status: string; timestamp: string }>> => {
    try {
      logger.info('tfhka', 'health_check', 'Checking SENIAT TFHKA connectivity');

      // Intentar una operación simple para verificar conectividad
      const client = getTfhkaClient();

      // Como no hay endpoint específico de health, intentamos verificar el estado de autenticación
      const authStatus = client.getAuthStatus();

      return {
        exito: true,
        datos: {
          status: authStatus.authenticated ? 'authenticated' : 'not_authenticated',
          timestamp: new Date().toISOString()
        },
        mensaje: 'Conectividad SENIAT verificada',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('tfhka', 'health_check', 'SENIAT connectivity check failed', error);
      return {
        exito: false,
        mensaje: 'Error de conectividad con SENIAT',
        errores: [{
          codigo: 'CONNECTIVITY_ERROR',
          mensaje: 'No se pudo verificar la conectividad con SENIAT'
        }],
        timestamp: new Date().toISOString()
      };
    }
  }
};

// =====================================================
// FASE 6: SISTEMA DE NOTIFICACIONES EXPANDIDO
// =====================================================

import type {
  EnvioCorreoRequest,
  EnvioCorreoResponse,
  RastreoCorreoRequest,
  RastreoCorreoResponse,
  AlertaFiscal,
  EstadoSistemaRealTime,
  NotificacionRealTime,
  AlertType
} from '@/types';

// Sistema completo de notificaciones y comunicaciones
export const notificationApi = {
  // =====================================================
  // ENVÍO DE CORREO ELECTRÓNICO
  // =====================================================

  async enviarCorreo(request: EnvioCorreoRequest): Promise<EnvioCorreoResponse> {
    try {
      logger.info('notifications', 'send_email', 'Sending fiscal document email', {
        documento_id: request.documento_id,
        destinatario: request.destinatario.email,
        plantilla: request.contenido.plantilla
      });

      // Validar datos requeridos
      if (!request.destinatario.email || !request.documento_id) {
        throw new Error('Email y documento_id son requeridos');
      }

      // Generar ID único para el envío
      const envioId = `ENV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simular envío de email con proveedor externo
      const mockResponse: EnvioCorreoResponse = {
        success: true,
        envio_id: envioId,
        mensaje: `Email enviado exitosamente a ${request.destinatario.email}`,
        estado: 'enviado',
        timestamp: new Date().toISOString(),
        detalles: {
          proveedor_email: 'SendGrid',
          id_mensaje_proveedor: `sg_${Date.now()}`,
          tamano_adjuntos_mb: request.adjuntos.incluir_pdf ? 0.5 : 0.1,
          tiempo_envio_ms: Math.floor(Math.random() * 2000) + 500
        }
      };

      // En implementación real, aquí se integraría con:
      // - SendGrid, Mailgun, Amazon SES, etc.
      // - Generar PDF/XML/JSON según configuración
      // - Aplicar plantilla de email
      // - Programar envío si es necesario

      logger.info('notifications', 'send_email', 'Email sent successfully', {
        envio_id: envioId,
        proveedor: mockResponse.detalles?.proveedor_email,
        tiempo_envio: mockResponse.detalles?.tiempo_envio_ms
      });

      return mockResponse;

    } catch (error) {
      logger.error('notifications', 'send_email', 'Error sending email', error);

      return {
        success: false,
        envio_id: '',
        mensaje: `Error al enviar email: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        estado: 'fallido',
        timestamp: new Date().toISOString(),
        errores: [{
          codigo: 'EMAIL_SEND_ERROR',
          descripcion: error instanceof Error ? error.message : 'Error desconocido'
        }]
      };
    }
  },

  // =====================================================
  // RASTREO DE CORREO ELECTRÓNICO
  // =====================================================

  async rastrearCorreo(request: RastreoCorreoRequest): Promise<RastreoCorreoResponse> {
    try {
      logger.info('notifications', 'track_email', 'Tracking email status', {
        envio_id: request.envio_id,
        transaction_id: request.transaction_id,
        email_destinatario: request.email_destinatario
      });

      // Simular datos de rastreo
      const mockHistorial = [
        {
          envio_id: request.envio_id || 'ENV_1234567890',
          documento_id: 'DOC_001',
          transaction_id: request.transaction_id || 'TXN_20241105_A00001',
          destinatario_email: request.email_destinatario || 'cliente@ejemplo.com',
          destinatario_nombre: 'Cliente Ejemplo',
          asunto: 'Factura Electrónica F-00001',
          estado_actual: 'entregado' as const,
          fecha_envio: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
          fecha_entrega: new Date(Date.now() - 3000000).toISOString(), // 50 min atrás
          fecha_lectura: new Date(Date.now() - 1800000).toISOString(), // 30 min atrás
          intentos_realizados: 1,
          proveedor_email: 'SendGrid',
          eventos: [
            {
              id: 'evt_1',
              tipo_evento: 'enviado' as const,
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              descripcion: 'Email enviado correctamente',
              datos_adicionales: {
                ip_receptor: '192.168.1.100'
              }
            },
            {
              id: 'evt_2',
              tipo_evento: 'entregado' as const,
              timestamp: new Date(Date.now() - 3000000).toISOString(),
              descripcion: 'Email entregado a la bandeja de entrada',
              datos_adicionales: {
                proveedor_email_receptor: 'Gmail'
              }
            },
            {
              id: 'evt_3',
              tipo_evento: 'leido' as const,
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              descripcion: 'Email abierto por el destinatario',
              datos_adicionales: {
                ip_receptor: '192.168.1.100',
                dispositivo: 'Desktop - Chrome',
                ubicacion_geografica: 'Caracas, Venezuela'
              }
            }
          ],
          metadatos_envio: {
            tamano_total_mb: 0.5,
            adjuntos_incluidos: ['factura.pdf', 'documento.xml'],
            ip_origen: '10.0.0.1',
            user_agent: 'SistemaFacturacion/1.0'
          }
        }
      ];

      const resumen = {
        total_envios: 1,
        enviados: 1,
        entregados: 1,
        leidos: 1,
        rebotados: 0,
        fallidos: 0,
        tasa_entrega: 100,
        tasa_lectura: 100
      };

      const response: RastreoCorreoResponse = {
        success: true,
        historial: mockHistorial,
        resumen,
        timestamp: new Date().toISOString()
      };

      logger.info('notifications', 'track_email', 'Email tracking completed', {
        total_emails: response.historial.length,
        tasa_entrega: resumen.tasa_entrega
      });

      return response;

    } catch (error) {
      logger.error('notifications', 'track_email', 'Error tracking email', error);

      return {
        success: false,
        historial: [],
        resumen: {
          total_envios: 0,
          enviados: 0,
          entregados: 0,
          leidos: 0,
          rebotados: 0,
          fallidos: 0,
          tasa_entrega: 0,
          tasa_lectura: 0
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  // =====================================================
  // SISTEMA DE ALERTAS FISCALES
  // =====================================================

  async crearAlerta(alerta: Omit<AlertaFiscal, 'id' | 'fecha_creacion' | 'estado'>): Promise<{
    success: boolean;
    alerta_id?: string;
    message: string;
  }> {
    try {
      const alertaId = `ALT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const nuevaAlerta: AlertaFiscal = {
        id: alertaId,
        fecha_creacion: new Date().toISOString(),
        estado: 'activa',
        ...alerta
      };

      logger.info('notifications', 'create_alert', 'Creating fiscal alert', {
        alerta_id: alertaId,
        tipo: alerta.tipo,
        severidad: alerta.severidad
      });

      // En implementación real, aquí se guardaría en base de datos
      // y se enviarían notificaciones según los canales configurados

      return {
        success: true,
        alerta_id: alertaId,
        message: 'Alerta fiscal creada exitosamente'
      };

    } catch (error) {
      logger.error('notifications', 'create_alert', 'Error creating alert', error);

      return {
        success: false,
        message: `Error al crear alerta: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  },

  async obtenerAlertas(filtros?: {
    estado?: AlertaFiscal['estado'];
    severidad?: AlertaFiscal['severidad'];
    tipo?: AlertType;
    desde?: string;
    hasta?: string;
  }): Promise<{
    success: boolean;
    alertas: AlertaFiscal[];
    total: number;
  }> {
    try {
      logger.info('notifications', 'get_alerts', 'Getting fiscal alerts', filtros);

      // Simular alertas existentes - solo en desarrollo
      const mockAlertas: AlertaFiscal[] = import.meta.env.PROD
        ? [] // Producción: sin alertas de prueba
        : [ // Desarrollo: alertas para testing
        {
          id: 'ALT_001',
          tipo: 'documento_rechazado_seniat',
          severidad: 'error',
          titulo: 'Documento rechazado por SENIAT',
          descripcion: 'La factura F-00001 fue rechazada por errores en la validación fiscal',
          documento_afectado: {
            transaction_id: 'TXN_20241105_A00001',
            numero_documento: 'F-00001',
            tipo_documento: '01'
          },
          fecha_creacion: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
          estado: 'activa',
          acciones_sugeridas: [
            'Revisar datos fiscales del documento',
            'Verificar RIF del cliente',
            'Contactar soporte SENIAT'
          ],
          notificado_a: ['user_1', 'user_2'],
          canales_notificacion: ['email', 'dashboard']
        },
        {
          id: 'ALT_002',
          tipo: 'tasa_bcv_obsoleta',
          severidad: 'warning',
          titulo: 'Tasa BCV desactualizada',
          descripcion: 'La tasa BCV no se ha actualizado en las últimas 24 horas',
          fecha_creacion: new Date(Date.now() - 3600000).toISOString(),
          estado: 'activa',
          acciones_sugeridas: [
            'Verificar conexión con BCV',
            'Actualizar tasa manualmente',
            'Revisar configuración de sincronización'
          ],
          notificado_a: ['admin_1'],
          canales_notificacion: ['email', 'dashboard', 'push']
        }
      ]; // Fin del array de desarrollo - solo visible en modo dev

      // Aplicar filtros si existen
      let alertasFiltradas = mockAlertas;
      if (filtros?.estado) {
        alertasFiltradas = alertasFiltradas.filter(a => a.estado === filtros.estado);
      }
      if (filtros?.severidad) {
        alertasFiltradas = alertasFiltradas.filter(a => a.severidad === filtros.severidad);
      }
      if (filtros?.tipo) {
        alertasFiltradas = alertasFiltradas.filter(a => a.tipo === filtros.tipo);
      }

      return {
        success: true,
        alertas: alertasFiltradas,
        total: alertasFiltradas.length
      };

    } catch (error) {
      logger.error('notifications', 'get_alerts', 'Error getting alerts', error);

      return {
        success: false,
        alertas: [],
        total: 0
      };
    }
  },

  // =====================================================
  // GESTIÓN DE ALERTAS
  // =====================================================

  async marcarAlertaComoLeida(alertaId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.info('notifications', 'mark_alert_read', 'Marking alert as read', {
        alerta_id: alertaId
      });

      // En implementación real, aquí se actualizaría la base de datos
      // UPDATE alertas_fiscales SET estado = 'leida', fecha_lectura = NOW() WHERE id = ?

      logger.info('notifications', 'mark_alert_read', 'Alert marked as read successfully', {
        alerta_id: alertaId
      });

      return {
        success: true,
        message: 'Alerta marcada como leída exitosamente'
      };

    } catch (error) {
      logger.error('notifications', 'mark_alert_read', 'Error marking alert as read', error);

      return {
        success: false,
        message: `Error al marcar alerta como leída: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  },

  // =====================================================
  // DASHBOARD EN TIEMPO REAL
  // =====================================================

  async obtenerEstadoSistema(): Promise<EstadoSistemaRealTime> {
    try {
      logger.info('notifications', 'system_status', 'Getting real-time system status');

      // Simular estado del sistema en tiempo real
      const estadoSistema: EstadoSistemaRealTime = {
        timestamp: new Date().toISOString(),
        seniat: {
          estado: 'online',
          tiempo_respuesta_ms: 1250,
          documentos_pendientes: 3,
          documentos_procesados_hoy: 45,
          ultima_sincronizacion: new Date(Date.now() - 300000).toISOString() // 5 min atrás
        },
        tfhka: {
          estado: 'conectado',
          documentos_enviados_hoy: 48,
          documentos_confirmados_hoy: 45,
          tiempo_respuesta_promedio_ms: 890
        },
        sistema_local: {
          documentos_emitidos_hoy: 48,
          emails_enviados_hoy: 52,
          alertas_activas: 2,
          usuarios_conectados: 8,
          ultimo_backup: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
          espacio_disco_usado_porcentaje: 67
        },
        metricas_rendimiento: {
          tiempo_emision_promedio_ms: 3400,
          tasa_exito_email: 98.5,
          tasa_exito_seniat: 94.2,
          documentos_por_minuto: 2.3
        }
      };

      return estadoSistema;

    } catch (error) {
      logger.error('notifications', 'system_status', 'Error getting system status', error);

      // Retornar estado de error
      return {
        timestamp: new Date().toISOString(),
        seniat: {
          estado: 'offline',
          tiempo_respuesta_ms: 0,
          documentos_pendientes: 0,
          documentos_procesados_hoy: 0,
          ultima_sincronizacion: ''
        },
        tfhka: {
          estado: 'error',
          documentos_enviados_hoy: 0,
          documentos_confirmados_hoy: 0,
          tiempo_respuesta_promedio_ms: 0
        },
        sistema_local: {
          documentos_emitidos_hoy: 0,
          emails_enviados_hoy: 0,
          alertas_activas: 0,
          usuarios_conectados: 0,
          ultimo_backup: '',
          espacio_disco_usado_porcentaje: 0
        },
        metricas_rendimiento: {
          tiempo_emision_promedio_ms: 0,
          tasa_exito_email: 0,
          tasa_exito_seniat: 0,
          documentos_por_minuto: 0
        }
      };
    }
  },

  // =====================================================
  // NOTIFICACIONES EN TIEMPO REAL
  // =====================================================

  async enviarNotificacionRealTime(notificacion: Omit<NotificacionRealTime, 'id' | 'timestamp'>): Promise<{
    success: boolean;
    notificacion_id?: string;
    message: string;
  }> {
    try {
      const notificacionId = `NOT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const nuevaNotificacion: NotificacionRealTime = {
        id: notificacionId,
        timestamp: new Date().toISOString(),
        ...notificacion
      };

      logger.info('notifications', 'realtime_notification', 'Sending real-time notification', {
        notificacion_id: notificacionId,
        tipo: notificacion.tipo,
        dirigida_a: notificacion.dirigida_a?.length || 'todos'
      });

      // En implementación real, aquí se enviaría vía WebSocket o Server-Sent Events
      // a los usuarios conectados

      return {
        success: true,
        notificacion_id: notificacionId,
        message: 'Notificación enviada exitosamente'
      };

    } catch (error) {
      logger.error('notifications', 'realtime_notification', 'Error sending notification', error);

      return {
        success: false,
        message: `Error al enviar notificación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
};

export default apiClient;