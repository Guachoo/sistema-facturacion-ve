import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Code,
  Copy,
  ChevronDown,
  ChevronRight,
  Key,
  Webhook,
  Book,
  Play,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: any;
  responses: Response[];
  examples: Example[];
  requiresAuth: boolean;
  rateLimit?: string;
}

interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description: string;
  example?: any;
}

interface Response {
  status: number;
  description: string;
  schema: any;
}

interface Example {
  title: string;
  request?: any;
  response: any;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/customers',
    summary: 'Listar clientes',
    description: 'Obtiene una lista paginada de todos los clientes activos',
    requiresAuth: true,
    rateLimit: '100 requests/min',
    parameters: [
      {
        name: 'page',
        in: 'query',
        required: false,
        type: 'integer',
        description: 'Número de página (default: 1)',
        example: 1
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        type: 'integer',
        description: 'Elementos por página (default: 20, max: 100)',
        example: 20
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Buscar por nombre o RIF',
        example: 'empresa'
      }
    ],
    responses: [
      {
        status: 200,
        description: 'Lista de clientes',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  rif: { type: 'string' },
                  nombre: { type: 'string' },
                  direccion: { type: 'string' },
                  telefono: { type: 'string' },
                  email: { type: 'string' },
                  tipo_cliente: { type: 'string', enum: ['natural', 'juridico'] },
                  contribuyente_especial: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        }
      }
    ],
    examples: [
      {
        title: 'Respuesta exitosa',
        response: {
          success: true,
          data: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              rif: 'J-12345678-0',
              nombre: 'Empresa Demo S.A.',
              direccion: 'Av. Principal, Caracas',
              telefono: '+58-212-1234567',
              email: 'contacto@empresademo.com',
              tipo_cliente: 'juridico',
              contribuyente_especial: true,
              created_at: '2024-01-15T10:30:00Z'
            }
          ],
          pagination: {
            total: 150,
            page: 1,
            limit: 20,
            pages: 8
          },
          timestamp: '2024-11-06T16:00:00Z',
          requestId: 'req_123456789',
          version: '1.0.0'
        }
      }
    ]
  },
  {
    method: 'POST',
    path: '/api/v1/customers',
    summary: 'Crear cliente',
    description: 'Crea un nuevo cliente en el sistema',
    requiresAuth: true,
    rateLimit: '50 requests/min',
    requestBody: {
      type: 'object',
      required: ['rif', 'nombre'],
      properties: {
        rif: { type: 'string', pattern: '^[VEJPG]-\\d{8}-\\d$' },
        nombre: { type: 'string', minLength: 1 },
        direccion: { type: 'string' },
        telefono: { type: 'string' },
        email: { type: 'string', format: 'email' },
        tipo_cliente: { type: 'string', enum: ['natural', 'juridico'], default: 'juridico' },
        zona_fiscal: { type: 'string' },
        contribuyente_especial: { type: 'boolean', default: false }
      }
    },
    responses: [
      {
        status: 201,
        description: 'Cliente creado exitosamente',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                rif: { type: 'string' },
                nombre: { type: 'string' },
                created_at: { type: 'string' }
              }
            }
          }
        }
      },
      {
        status: 400,
        description: 'Datos inválidos',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    ],
    examples: [
      {
        title: 'Crear cliente jurídico',
        request: {
          rif: 'J-98765432-1',
          nombre: 'Nueva Empresa C.A.',
          direccion: 'Av. Libertador, Valencia',
          telefono: '+58-241-5555555',
          email: 'info@nuevaempresa.com',
          tipo_cliente: 'juridico',
          contribuyente_especial: false
        },
        response: {
          success: true,
          data: {
            id: '456e7890-e12b-34d5-b678-901234567890',
            rif: 'J-98765432-1',
            nombre: 'Nueva Empresa C.A.',
            direccion: 'Av. Libertador, Valencia',
            telefono: '+58-241-5555555',
            email: 'info@nuevaempresa.com',
            tipo_cliente: 'juridico',
            contribuyente_especial: false,
            created_at: '2024-11-06T16:30:00Z',
            updated_at: '2024-11-06T16:30:00Z'
          },
          timestamp: '2024-11-06T16:30:00Z',
          requestId: 'req_987654321',
          version: '1.0.0'
        }
      }
    ]
  },
  {
    method: 'POST',
    path: '/api/v1/invoices',
    summary: 'Crear factura',
    description: 'Crea una nueva factura con cálculos automáticos de impuestos',
    requiresAuth: true,
    rateLimit: '30 requests/min',
    requestBody: {
      type: 'object',
      required: ['cliente_rif', 'fecha_emision', 'moneda', 'tasa_bcv', 'items'],
      properties: {
        cliente_rif: { type: 'string' },
        fecha_emision: { type: 'string', format: 'date-time' },
        moneda: { type: 'string', enum: ['VES', 'USD'] },
        tasa_bcv: { type: 'number', minimum: 0 },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['codigo', 'descripcion', 'cantidad', 'precio_unitario'],
            properties: {
              codigo: { type: 'string' },
              descripcion: { type: 'string' },
              cantidad: { type: 'number', minimum: 0.01 },
              precio_unitario: { type: 'number', minimum: 0.01 },
              tipo_iva: { type: 'string', enum: ['exento', 'general', 'reducido'], default: 'general' },
              descuento_porcentaje: { type: 'number', minimum: 0, maximum: 100, default: 0 }
            }
          }
        },
        observaciones: { type: 'string' },
        serie: { type: 'string' }
      }
    },
    responses: [
      {
        status: 201,
        description: 'Factura creada exitosamente',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                numero: { type: 'string' },
                numero_control: { type: 'string' },
                subtotal: { type: 'number' },
                iva: { type: 'number' },
                igtf: { type: 'number' },
                total: { type: 'number' },
                status: { type: 'string' }
              }
            }
          }
        }
      }
    ],
    examples: [
      {
        title: 'Crear factura en USD',
        request: {
          cliente_rif: 'J-12345678-0',
          fecha_emision: '2024-11-06T16:00:00Z',
          moneda: 'USD',
          tasa_bcv: 45.50,
          items: [
            {
              codigo: 'SERV001',
              descripcion: 'Consultoría Técnica',
              cantidad: 8,
              precio_unitario: 125.00,
              tipo_iva: 'general',
              descuento_porcentaje: 0
            }
          ],
          observaciones: 'Servicios de consultoría mes de noviembre',
          serie: 'F'
        },
        response: {
          success: true,
          data: {
            id: '789e0123-e45b-67d8-c901-234567890123',
            numero: 'F-00015',
            serie: 'F',
            numero_control: 'C00000015',
            cliente_rif: 'J-12345678-0',
            cliente_nombre: 'Empresa Demo S.A.',
            fecha_emision: '2024-11-06T16:00:00Z',
            moneda: 'USD',
            tasa_bcv: 45.50,
            subtotal: 1000.00,
            iva: 160.00,
            igtf: 34.80,
            total: 1194.80,
            total_ves: 54365.40,
            status: 'emitida',
            items: [
              {
                codigo: 'SERV001',
                descripcion: 'Consultoría Técnica',
                cantidad: 8,
                precio_unitario: 125.00,
                subtotal: 1000.00,
                iva: 160.00,
                total: 1160.00
              }
            ],
            created_at: '2024-11-06T16:00:00Z'
          },
          timestamp: '2024-11-06T16:00:00Z',
          requestId: 'req_555666777',
          version: '1.0.0'
        }
      }
    ]
  }
];

const WEBHOOK_EVENTS = [
  {
    event: 'invoice.created',
    description: 'Se dispara cuando se crea una nueva factura',
    payload: {
      event: 'invoice.created',
      data: {
        id: 'string',
        numero: 'string',
        cliente_rif: 'string',
        total: 'number',
        moneda: 'string',
        status: 'string',
        created_at: 'string'
      },
      timestamp: 'string',
      webhook_id: 'string'
    }
  },
  {
    event: 'customer.created',
    description: 'Se dispara cuando se crea un nuevo cliente',
    payload: {
      event: 'customer.created',
      data: {
        id: 'string',
        rif: 'string',
        nombre: 'string',
        tipo_cliente: 'string',
        created_at: 'string'
      },
      timestamp: 'string',
      webhook_id: 'string'
    }
  }
];

export function ApiDocumentationPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testApiKey, setTestApiKey] = useState('test-key-123');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const generateCurlExample = (endpoint: ApiEndpoint) => {
    const hasBody = endpoint.method === 'POST' || endpoint.method === 'PUT';
    const example = endpoint.examples[0];

    let curl = `curl -X ${endpoint.method} \\
  https://api.sistemavenezuela.com${endpoint.path} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

    if (hasBody && example?.request) {
      curl += ` \\
  -d '${JSON.stringify(example.request, null, 2)}'`;
    }

    return curl;
  };

  const MethodBadge = ({ method }: { method: string }) => {
    const variants = {
      GET: 'default',
      POST: 'default',
      PUT: 'secondary',
      DELETE: 'destructive'
    };

    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[method as keyof typeof colors]}>
        {method}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Documentación completa de la API REST del Sistema de Facturación VE
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="#postman" target="_blank">
              <Download className="h-4 w-4 mr-2" />
              Postman Collection
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="#openapi" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              OpenAPI Spec
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="auth">Autenticación</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="examples">Ejemplos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                API Overview
              </CardTitle>
              <CardDescription>
                Información general sobre la API REST del Sistema de Facturación VE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <h3 className="font-semibold">Base URL</h3>
                  <code className="text-sm text-muted-foreground">
                    https://api.sistemavenezuela.com
                  </code>
                </div>
                <div className="text-center p-4 border rounded">
                  <h3 className="font-semibold">Versión</h3>
                  <code className="text-sm text-muted-foreground">v1.0.0</code>
                </div>
                <div className="text-center p-4 border rounded">
                  <h3 className="font-semibold">Formato</h3>
                  <code className="text-sm text-muted-foreground">JSON</code>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Características</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>API RESTful con recursos estándar (Clientes, Facturas, Items)</li>
                  <li>Autenticación mediante API Key</li>
                  <li>Rate limiting configurable por cliente</li>
                  <li>Webhooks para notificaciones en tiempo real</li>
                  <li>Validación automática de datos fiscales venezolanos</li>
                  <li>Cálculo automático de impuestos (IVA, IGTF)</li>
                  <li>Soporte para múltiples monedas (VES, USD)</li>
                  <li>Auditoría completa de todas las operaciones</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Rate Limits</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Lectura (GET)</span>
                    <Badge variant="outline">100 req/min</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Escritura (POST/PUT)</span>
                    <Badge variant="outline">50 req/min</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Eliminación (DELETE)</span>
                    <Badge variant="outline">20 req/min</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Autenticación
              </CardTitle>
              <CardDescription>
                Cómo autenticarse con la API usando API Keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">API Key Authentication</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Todas las solicitudes a la API deben incluir una API Key válida en el header Authorization.
                </p>

                <div className="bg-muted p-4 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Obtener API Key</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Para obtener una API Key, contacte al administrador del sistema o:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acceda al panel de administración</li>
                  <li>Vaya a Configuración → Integraciones</li>
                  <li>Haga clic en "Generar Nueva API Key"</li>
                  <li>Configure los permisos necesarios</li>
                  <li>Guarde la API Key de forma segura</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Probar Autenticación</h3>
                <div className="space-y-2">
                  <Input
                    placeholder="Ingrese su API Key"
                    value={testApiKey}
                    onChange={(e) => setTestApiKey(e.target.value)}
                  />
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Probar API Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <div className="grid gap-4">
            {API_ENDPOINTS.map((endpoint, index) => (
              <Card key={index}>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MethodBadge method={endpoint.method} />
                          <div>
                            <CardTitle className="text-lg">{endpoint.path}</CardTitle>
                            <CardDescription>{endpoint.summary}</CardDescription>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        {endpoint.description}
                      </p>

                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Parámetros</h4>
                          <div className="space-y-2">
                            {endpoint.parameters.map((param, paramIndex) => (
                              <div key={paramIndex} className="border rounded p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-mono">{param.name}</code>
                                  <Badge variant={param.required ? "default" : "secondary"}>
                                    {param.required ? 'Required' : 'Optional'}
                                  </Badge>
                                  <Badge variant="outline">{param.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {param.description}
                                </p>
                                {param.example && (
                                  <div className="mt-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      Ejemplo: {JSON.stringify(param.example)}
                                    </code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {endpoint.requestBody && (
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <div className="bg-muted p-4 rounded">
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(endpoint.requestBody, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2">Respuestas</h4>
                        <div className="space-y-2">
                          {endpoint.responses.map((response, responseIndex) => (
                            <div key={responseIndex} className="border rounded p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={response.status < 400 ? "default" : "destructive"}>
                                  {response.status}
                                </Badge>
                                <span className="text-sm">{response.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Ejemplo cURL</h4>
                        <div className="bg-muted p-4 rounded relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(generateCurlExample(endpoint))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <pre className="text-xs overflow-auto pr-8">
                            {generateCurlExample(endpoint)}
                          </pre>
                        </div>
                      </div>

                      {endpoint.examples.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Ejemplos</h4>
                          {endpoint.examples.map((example, exampleIndex) => (
                            <div key={exampleIndex} className="space-y-2">
                              <h5 className="text-sm font-medium">{example.title}</h5>
                              {example.request && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Request:</p>
                                  <div className="bg-muted p-3 rounded">
                                    <pre className="text-xs overflow-auto">
                                      {JSON.stringify(example.request, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Response:</p>
                                <div className="bg-muted p-3 rounded">
                                  <pre className="text-xs overflow-auto">
                                    {JSON.stringify(example.response, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Reciba notificaciones en tiempo real de eventos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">¿Qué son los Webhooks?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Los webhooks son notificaciones HTTP POST que se envían a su servidor cuando ocurren eventos específicos en el sistema.
                  Esto le permite reaccionar en tiempo real a cambios importantes como la creación de facturas o clientes.
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Configuración</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Configure un endpoint HTTPS en su servidor</li>
                  <li>Vaya a Configuración → Webhooks en el sistema</li>
                  <li>Agregue la URL de su endpoint</li>
                  <li>Seleccione los eventos que desea recibir</li>
                  <li>Configure reintentos y headers personalizados</li>
                  <li>Active el webhook</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Verificación de Firma</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Cada webhook incluye una firma HMAC-SHA256 en el header <code>X-Webhook-Signature</code>
                  que puede usar para verificar que la solicitud proviene realmente del sistema.
                </p>
                <div className="bg-muted p-4 rounded">
                  <pre className="text-xs overflow-auto">
{`// Ejemplo de verificación en Node.js
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(calculatedSignature, 'hex')
  );
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Eventos Disponibles</h3>
                <div className="space-y-3">
                  {WEBHOOK_EVENTS.map((event, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {event.event}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver payload de ejemplo
                        </summary>
                        <div className="bg-muted p-2 rounded mt-2">
                          <pre className="overflow-auto">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Ejemplos de Integración
              </CardTitle>
              <CardDescription>
                Ejemplos prácticos en diferentes lenguajes de programación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">JavaScript (Node.js)</h3>
                <div className="bg-muted p-4 rounded relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`// Crear cliente usando fetch
const response = await fetch('https://api.sistemavenezuela.com/api/v1/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rif: 'J-12345678-0',
    nombre: 'Mi Empresa S.A.',
    email: 'contacto@miempresa.com',
    tipo_cliente: 'juridico'
  })
});

const result = await response.json();
console.log('Cliente creado:', result.data);`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="text-xs overflow-auto pr-8">
{`// Crear cliente usando fetch
const response = await fetch('https://api.sistemavenezuela.com/api/v1/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rif: 'J-12345678-0',
    nombre: 'Mi Empresa S.A.',
    email: 'contacto@miempresa.com',
    tipo_cliente: 'juridico'
  })
});

const result = await response.json();
console.log('Cliente creado:', result.data);`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">PHP</h3>
                <div className="bg-muted p-4 rounded relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`<?php
// Crear factura usando cURL
$data = [
    'cliente_rif' => 'J-12345678-0',
    'fecha_emision' => date('c'),
    'moneda' => 'USD',
    'tasa_bcv' => 45.50,
    'items' => [
        [
            'codigo' => 'SERV001',
            'descripcion' => 'Desarrollo Web',
            'cantidad' => 1,
            'precio_unitario' => 1000.00
        ]
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.sistemavenezuela.com/api/v1/invoices');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

echo "Factura creada: " . $result['data']['numero'];
?>`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="text-xs overflow-auto pr-8">
{`<?php
// Crear factura usando cURL
$data = [
    'cliente_rif' => 'J-12345678-0',
    'fecha_emision' => date('c'),
    'moneda' => 'USD',
    'tasa_bcv' => 45.50,
    'items' => [
        [
            'codigo' => 'SERV001',
            'descripcion' => 'Desarrollo Web',
            'cantidad' => 1,
            'precio_unitario' => 1000.00
        ]
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.sistemavenezuela.com/api/v1/invoices');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

echo "Factura creada: " . $result['data']['numero'];
?>`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Python</h3>
                <div className="bg-muted p-4 rounded relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`import requests
import json

# Listar clientes con filtros
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

params = {
    'page': 1,
    'limit': 50,
    'search': 'empresa'
}

response = requests.get(
    'https://api.sistemavenezuela.com/api/v1/customers',
    headers=headers,
    params=params
)

if response.status_code == 200:
    data = response.json()
    print(f"Total clientes: {data['pagination']['total']}")
    for customer in data['data']:
        print(f"- {customer['nombre']} ({customer['rif']})")
else:
    print(f"Error: {response.status_code}")`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="text-xs overflow-auto pr-8">
{`import requests
import json

# Listar clientes con filtros
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

params = {
    'page': 1,
    'limit': 50,
    'search': 'empresa'
}

response = requests.get(
    'https://api.sistemavenezuela.com/api/v1/customers',
    headers=headers,
    params=params
)

if response.status_code == 200:
    data = response.json()
    print(f"Total clientes: {data['pagination']['total']}")
    for customer in data['data']:
        print(f"- {customer['nombre']} ({customer['rif']})")
else:
    print(f"Error: {response.status_code}")`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}