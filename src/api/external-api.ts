import { z } from 'zod';
import { auditSystem } from '@/lib/audit-system';

// FASE 10: API REST Externa para Integraciones

// Tipos para la API externa
export interface ExternalApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
  version: string;
}

export interface ApiKeyAuth {
  apiKey: string;
  clientId: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    windowMs: number;
  };
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  retryAttempts: number;
  headers?: Record<string, string>;
}

// Esquemas de validación
const CustomerCreateSchema = z.object({
  rif: z.string().regex(/^[VEJPG]-?\d{8}-?\d$/i, 'RIF inválido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  tipo_cliente: z.enum(['natural', 'juridico']).default('juridico'),
  zona_fiscal: z.string().optional(),
  contribuyente_especial: z.boolean().default(false)
});

const InvoiceCreateSchema = z.object({
  cliente_rif: z.string(),
  fecha_emision: z.string().datetime(),
  moneda: z.enum(['VES', 'USD']),
  tasa_bcv: z.number().positive(),
  items: z.array(z.object({
    codigo: z.string(),
    descripcion: z.string(),
    cantidad: z.number().positive(),
    precio_unitario: z.number().positive(),
    tipo_iva: z.enum(['exento', 'general', 'reducido']).default('general'),
    descuento_porcentaje: z.number().min(0).max(100).default(0)
  })).min(1, 'Al menos un item requerido'),
  observaciones: z.string().optional(),
  serie: z.string().optional()
});

const ItemCreateSchema = z.object({
  codigo: z.string().min(1, 'Código requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  precio_base: z.number().positive(),
  unidad_medida: z.string().default('UND'),
  tipo_iva: z.enum(['exento', 'general', 'reducido']).default('general'),
  categoria: z.string().optional(),
  activo: z.boolean().default(true)
});

// Clase para manejar la API externa
class ExternalApiHandler {
  private apiKeys = new Map<string, ApiKeyAuth>();
  private webhooks = new Map<string, WebhookConfig>();
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    // API Keys de ejemplo para testing
    this.apiKeys.set('test-key-123', {
      apiKey: 'test-key-123',
      clientId: 'test-client',
      permissions: ['read:customers', 'write:customers', 'read:invoices', 'write:invoices', 'read:items'],
      rateLimit: { requests: 100, windowMs: 60000 } // 100 requests por minuto
    });

    this.apiKeys.set('admin-key-456', {
      apiKey: 'admin-key-456',
      clientId: 'admin-client',
      permissions: ['*'], // Todos los permisos
      rateLimit: { requests: 1000, windowMs: 60000 } // 1000 requests por minuto
    });
  }

  // Validar API Key y permisos
  private validateApiKey(apiKey: string, requiredPermission: string): ApiKeyAuth | null {
    const auth = this.apiKeys.get(apiKey);
    if (!auth) return null;

    // Verificar rate limiting
    const now = Date.now();
    const requestData = this.requestCounts.get(apiKey) || { count: 0, resetTime: now + auth.rateLimit.windowMs };

    if (now > requestData.resetTime) {
      requestData.count = 0;
      requestData.resetTime = now + auth.rateLimit.windowMs;
    }

    if (requestData.count >= auth.rateLimit.requests) {
      return null; // Rate limit exceeded
    }

    requestData.count++;
    this.requestCounts.set(apiKey, requestData);

    // Verificar permisos
    if (!auth.permissions.includes('*') && !auth.permissions.includes(requiredPermission)) {
      return null;
    }

    return auth;
  }

  // Crear respuesta estandarizada
  private createResponse<T>(success: boolean, data?: T, error?: string): ExternalApiResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0'
    };
  }

  // Auditar llamadas a la API
  private async auditApiCall(
    apiKey: string,
    endpoint: string,
    method: string,
    success: boolean,
    error?: string
  ) {
    const auth = this.apiKeys.get(apiKey);
    await auditSystem.log({
      userId: auth?.clientId || 'unknown',
      userEmail: `${auth?.clientId}@external-api`,
      userName: auth?.clientId || 'External API Client',
      action: 'export_data',
      resource: endpoint,
      ipAddress: 'external',
      userAgent: 'External API Client',
      deviceFingerprint: apiKey.substring(0, 8),
      sessionId: `api_session_${Date.now()}`,
      success,
      errorMessage: error,
      metadata: {
        api_endpoint: endpoint,
        http_method: method,
        client_id: auth?.clientId
      }
    });
  }

  // Endpoints de Clientes
  async getCustomers(apiKey: string, filters?: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'read:customers');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/customers', 'GET', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      // Simular consulta a la base de datos
      await new Promise(resolve => setTimeout(resolve, 200));

      const mockCustomers = [
        {
          id: '1',
          rif: 'J-12345678-0',
          nombre: 'Empresa Demo S.A.',
          direccion: 'Av. Principal, Caracas',
          telefono: '+58-212-1234567',
          email: 'contacto@empresademo.com',
          tipo_cliente: 'juridico',
          contribuyente_especial: true,
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          rif: 'V-87654321-5',
          nombre: 'Juan Pérez',
          direccion: 'Calle 123, Maracaibo',
          telefono: '+58-261-9876543',
          email: 'juan.perez@email.com',
          tipo_cliente: 'natural',
          contribuyente_especial: false,
          created_at: '2024-02-20T14:15:00Z'
        }
      ];

      await this.auditApiCall(apiKey, '/api/v1/customers', 'GET', true);
      return this.createResponse(true, mockCustomers);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/customers', 'GET', false, error.message);
      return this.createResponse(false, null, 'Internal server error');
    }
  }

  async createCustomer(apiKey: string, customerData: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'write:customers');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/customers', 'POST', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      // Validar datos
      const validatedData = CustomerCreateSchema.parse(customerData);

      // Simular creación en base de datos
      await new Promise(resolve => setTimeout(resolve, 300));

      const newCustomer = {
        id: crypto.randomUUID(),
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.auditApiCall(apiKey, '/api/v1/customers', 'POST', true);
      return this.createResponse(true, newCustomer);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/customers', 'POST', false, error.message);
      return this.createResponse(false, null, error.message);
    }
  }

  // Endpoints de Facturas
  async getInvoices(apiKey: string, filters?: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'read:invoices');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/invoices', 'GET', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 250));

      const mockInvoices = [
        {
          id: '1',
          numero: 'F-00001',
          serie: 'F',
          numero_control: 'C00000001',
          cliente_rif: 'J-12345678-0',
          cliente_nombre: 'Empresa Demo S.A.',
          fecha_emision: '2024-11-06T10:00:00Z',
          moneda: 'VES',
          tasa_bcv: 45.50,
          subtotal: 1000.00,
          iva: 160.00,
          igtf: 93.12,
          total: 1253.12,
          status: 'emitida',
          created_at: '2024-11-06T10:00:00Z'
        }
      ];

      await this.auditApiCall(apiKey, '/api/v1/invoices', 'GET', true);
      return this.createResponse(true, mockInvoices);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/invoices', 'GET', false, error.message);
      return this.createResponse(false, null, 'Internal server error');
    }
  }

  async createInvoice(apiKey: string, invoiceData: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'write:invoices');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/invoices', 'POST', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      // Validar datos
      const validatedData = InvoiceCreateSchema.parse(invoiceData);

      // Simular cálculos fiscales
      await new Promise(resolve => setTimeout(resolve, 500));

      const subtotal = validatedData.items.reduce((sum, item) => {
        const itemTotal = item.cantidad * item.precio_unitario;
        const descuento = itemTotal * (item.descuento_porcentaje / 100);
        return sum + (itemTotal - descuento);
      }, 0);

      const iva = subtotal * 0.16; // 16% IVA
      const igtf = validatedData.moneda === 'USD' ? (subtotal + iva) * 0.03 : 0; // 3% IGTF para USD
      const total = subtotal + iva + igtf;

      const newInvoice = {
        id: crypto.randomUUID(),
        numero: 'F-' + String(Date.now()).slice(-5),
        serie: validatedData.serie || 'F',
        numero_control: 'C' + String(Date.now()).slice(-8),
        ...validatedData,
        subtotal,
        iva,
        igtf,
        total,
        status: 'emitida',
        created_at: new Date().toISOString()
      };

      // Disparar webhook de factura creada
      await this.triggerWebhook('invoice.created', newInvoice);

      await this.auditApiCall(apiKey, '/api/v1/invoices', 'POST', true);
      return this.createResponse(true, newInvoice);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/invoices', 'POST', false, error.message);
      return this.createResponse(false, null, error.message);
    }
  }

  // Endpoints de Items
  async getItems(apiKey: string, filters?: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'read:items');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/items', 'GET', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 150));

      const mockItems = [
        {
          id: '1',
          codigo: 'SERV001',
          descripcion: 'Consultoría Técnica',
          precio_base: 500.00,
          unidad_medida: 'HORA',
          tipo_iva: 'general',
          categoria: 'servicios',
          activo: true,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          codigo: 'PROD001',
          descripcion: 'Software Licencia Anual',
          precio_base: 2400.00,
          unidad_medida: 'UND',
          tipo_iva: 'general',
          categoria: 'software',
          activo: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      await this.auditApiCall(apiKey, '/api/v1/items', 'GET', true);
      return this.createResponse(true, mockItems);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/items', 'GET', false, error.message);
      return this.createResponse(false, null, 'Internal server error');
    }
  }

  async createItem(apiKey: string, itemData: any): Promise<ExternalApiResponse> {
    const auth = this.validateApiKey(apiKey, 'write:items');
    if (!auth) {
      await this.auditApiCall(apiKey, '/api/v1/items', 'POST', false, 'Unauthorized');
      return this.createResponse(false, null, 'Unauthorized or rate limit exceeded');
    }

    try {
      // Validar datos
      const validatedData = ItemCreateSchema.parse(itemData);

      await new Promise(resolve => setTimeout(resolve, 200));

      const newItem = {
        id: crypto.randomUUID(),
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.auditApiCall(apiKey, '/api/v1/items', 'POST', true);
      return this.createResponse(true, newItem);
    } catch (error) {
      await this.auditApiCall(apiKey, '/api/v1/items', 'POST', false, error.message);
      return this.createResponse(false, null, error.message);
    }
  }

  // Gestión de Webhooks
  registerWebhook(config: WebhookConfig): boolean {
    this.webhooks.set(config.id, config);
    return true;
  }

  async triggerWebhook(event: string, data: any): Promise<void> {
    const activeWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => webhook.active && webhook.events.includes(event));

    const webhookPromises = activeWebhooks.map(async (webhook) => {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };

      const signature = await this.generateWebhookSignature(payload, webhook.secret);

      for (let attempt = 0; attempt <= webhook.retryAttempts; attempt++) {
        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
              ...webhook.headers
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            console.log(`✅ Webhook ${webhook.id} delivered successfully for event ${event}`);
            break;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`❌ Webhook ${webhook.id} attempt ${attempt + 1} failed:`, error.message);
          if (attempt === webhook.retryAttempts) {
            console.error(`🚨 Webhook ${webhook.id} failed permanently for event ${event}`);
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  private async generateWebhookSignature(payload: any, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Obtener estadísticas de uso de la API
  getApiStats(apiKey: string): ExternalApiResponse {
    const auth = this.validateApiKey(apiKey, 'read:stats');
    if (!auth) {
      return this.createResponse(false, null, 'Unauthorized');
    }

    const requestData = this.requestCounts.get(apiKey) || { count: 0, resetTime: 0 };
    const stats = {
      client_id: auth.clientId,
      current_requests: requestData.count,
      rate_limit: auth.rateLimit.requests,
      window_ms: auth.rateLimit.windowMs,
      reset_time: new Date(requestData.resetTime).toISOString(),
      permissions: auth.permissions
    };

    return this.createResponse(true, stats);
  }
}

// Instancia singleton de la API
export const externalApi = new ExternalApiHandler();

// Funciones de utilidad para testing
export const ExternalApiUtils = {
  generateApiKey: (): string => {
    return 'key_' + crypto.randomUUID().replace(/-/g, '');
  },

  validateWebhookSignature: async (payload: string, signature: string, secret: string): Promise<boolean> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const key = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    return await crypto.subtle.verify('HMAC', cryptoKey, signatureBuffer, data);
  }
};

export type {
  ExternalApiResponse,
  ApiKeyAuth,
  WebhookConfig
};