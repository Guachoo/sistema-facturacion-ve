import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Webhook,
  Plus,
  Settings,
  Trash2,
  TestTube,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy
} from 'lucide-react';
import { externalApi, type WebhookConfig } from '@/api/external-api';
import { useAuditIntegration } from '@/hooks/use-audit-integration';
import { toast } from 'sonner';

const AVAILABLE_EVENTS = [
  { value: 'invoice.created', label: 'Factura Creada', description: 'Se dispara cuando se crea una nueva factura' },
  { value: 'invoice.updated', label: 'Factura Actualizada', description: 'Se dispara cuando se actualiza una factura' },
  { value: 'invoice.voided', label: 'Factura Anulada', description: 'Se dispara cuando se anula una factura' },
  { value: 'customer.created', label: 'Cliente Creado', description: 'Se dispara cuando se crea un nuevo cliente' },
  { value: 'customer.updated', label: 'Cliente Actualizado', description: 'Se dispara cuando se actualiza un cliente' },
  { value: 'payment.received', label: 'Pago Recibido', description: 'Se dispara cuando se registra un pago' },
  { value: 'rate.updated', label: 'Tasa Actualizada', description: 'Se dispara cuando se actualiza la tasa BCV' },
  { value: 'backup.completed', label: 'Backup Completado', description: 'Se dispara cuando se completa un backup' },
  { value: 'system.maintenance', label: 'Mantenimiento Sistema', description: 'Se dispara durante mantenimientos programados' }
];

interface WebhookTest {
  id: string;
  webhookId: string;
  event: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  responseTime?: number;
  error?: string;
}

export function WebhookManagementPage() {
  const { logOperation } = useAuditIntegration();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [testResults, setTestResults] = useState<WebhookTest[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    active: true,
    retryAttempts: 3,
    headers: {} as Record<string, string>,
    customHeaders: ''
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = () => {
    // Simular carga de webhooks
    const mockWebhooks: WebhookConfig[] = [
      {
        id: '1',
        url: 'https://api.ejemplo.com/webhooks/facturas',
        events: ['invoice.created', 'invoice.updated'],
        active: true,
        secret: 'wh_secret_123',
        retryAttempts: 3,
        headers: { 'Authorization': 'Bearer token123' }
      },
      {
        id: '2',
        url: 'https://crm.empresa.com/webhook',
        events: ['customer.created', 'customer.updated'],
        active: false,
        secret: 'wh_secret_456',
        retryAttempts: 5,
        headers: {}
      }
    ];
    setWebhooks(mockWebhooks);
  };

  const resetForm = () => {
    setFormData({
      url: '',
      events: [],
      active: true,
      retryAttempts: 3,
      headers: {},
      customHeaders: ''
    });
    setEditingWebhook(null);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      retryAttempts: webhook.retryAttempts,
      headers: webhook.headers || {},
      customHeaders: Object.entries(webhook.headers || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    });
    setIsDialogOpen(true);
  };

  const handleSaveWebhook = async () => {
    try {
      // Parsear headers personalizados
      const headers: Record<string, string> = {};
      if (formData.customHeaders) {
        formData.customHeaders.split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            headers[key] = value;
          }
        });
      }

      const webhookConfig: WebhookConfig = {
        id: editingWebhook?.id || crypto.randomUUID(),
        url: formData.url,
        events: formData.events,
        active: formData.active,
        secret: editingWebhook?.secret || `wh_secret_${Date.now()}`,
        retryAttempts: formData.retryAttempts,
        headers
      };

      // Registrar webhook en el sistema
      externalApi.registerWebhook(webhookConfig);

      // Actualizar lista local
      if (editingWebhook) {
        setWebhooks(prev => prev.map(w => w.id === editingWebhook.id ? webhookConfig : w));
        await logOperation('update_webhook', 'webhook', webhookConfig.id, editingWebhook, webhookConfig);
        toast.success('Webhook actualizado correctamente');
      } else {
        setWebhooks(prev => [...prev, webhookConfig]);
        await logOperation('create_webhook', 'webhook', webhookConfig.id, undefined, webhookConfig);
        toast.success('Webhook creado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al guardar webhook: ' + error.message);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const webhook = webhooks.find(w => w.id === webhookId);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      await logOperation('delete_webhook', 'webhook', webhookId, webhook, undefined);
      toast.success('Webhook eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar webhook');
    }
  };

  const handleToggleActive = async (webhookId: string, active: boolean) => {
    try {
      const oldWebhook = webhooks.find(w => w.id === webhookId);
      const updatedWebhook = { ...oldWebhook!, active };

      setWebhooks(prev => prev.map(w => w.id === webhookId ? updatedWebhook : w));
      externalApi.registerWebhook(updatedWebhook);

      await logOperation('update_webhook', 'webhook', webhookId, oldWebhook, updatedWebhook);
      toast.success(`Webhook ${active ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al actualizar webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setIsTestingWebhook(webhookId);

    const testPayload = {
      event: 'webhook.test',
      data: {
        message: 'Test webhook from Sistema de Facturación VE',
        timestamp: new Date().toISOString(),
        test_id: crypto.randomUUID()
      },
      timestamp: new Date().toISOString(),
      webhook_id: webhookId
    };

    const testStart = Date.now();
    const testId = crypto.randomUUID();

    try {
      // Simular envío de webhook test
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const success = Math.random() > 0.3; // 70% de éxito simulado
      const responseTime = Date.now() - testStart;

      const testResult: WebhookTest = {
        id: testId,
        webhookId,
        event: 'webhook.test',
        timestamp: new Date(),
        status: success ? 'success' : 'failed',
        responseCode: success ? 200 : 500,
        responseTime,
        error: success ? undefined : 'Connection timeout'
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Mantener últimos 10

      if (success) {
        toast.success(`Test exitoso (${responseTime}ms)`);
      } else {
        toast.error(`Test falló: ${testResult.error}`);
      }

      await logOperation('test_webhook', 'webhook', webhookId, undefined, testResult);
    } catch (error) {
      const testResult: WebhookTest = {
        id: testId,
        webhookId,
        event: 'webhook.test',
        timestamp: new Date(),
        status: 'failed',
        responseTime: Date.now() - testStart,
        error: error.message
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      toast.error('Error en test: ' + error.message);
    } finally {
      setIsTestingWebhook(null);
    }
  };

  const copyWebhookSecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copiado al portapapeles');
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'failed') => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhooks para recibir notificaciones de eventos fiscales
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Editar Webhook' : 'Crear Nuevo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure un endpoint para recibir notificaciones de eventos del sistema
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">URL del Endpoint</Label>
                <Input
                  id="url"
                  placeholder="https://api.ejemplo.com/webhook"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label>Eventos a Suscribir</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                  {AVAILABLE_EVENTS.map(event => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={event.value}
                        checked={formData.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, events: [...prev.events, event.value] }));
                          } else {
                            setFormData(prev => ({ ...prev, events: prev.events.filter(ev => ev !== event.value) }));
                          }
                        }}
                      />
                      <label htmlFor={event.value} className="text-sm">
                        {event.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="retryAttempts">Reintentos</Label>
                  <Select value={formData.retryAttempts.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 reintentos</SelectItem>
                      <SelectItem value="1">1 reintento</SelectItem>
                      <SelectItem value="3">3 reintentos</SelectItem>
                      <SelectItem value="5">5 reintentos</SelectItem>
                      <SelectItem value="10">10 reintentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Activo</Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customHeaders">Headers Personalizados (opcional)</Label>
                <Textarea
                  id="customHeaders"
                  placeholder="Authorization: Bearer token123&#10;Content-Type: application/json"
                  value={formData.customHeaders}
                  onChange={(e) => setFormData(prev => ({ ...prev, customHeaders: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Un header por línea en formato "Clave: Valor"
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveWebhook}>
                {editingWebhook ? 'Actualizar' : 'Crear'} Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Webhooks */}
      <div className="grid gap-4">
        {webhooks.map(webhook => (
          <Card key={webhook.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Webhook className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{webhook.url}</CardTitle>
                    <CardDescription>
                      {webhook.events.length} eventos • {webhook.retryAttempts} reintentos máx.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={webhook.active ? "default" : "secondary"}>
                    {webhook.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Switch
                    checked={webhook.active}
                    onCheckedChange={(checked) => handleToggleActive(webhook.id, checked)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Eventos Suscritos:</p>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map(event => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {AVAILABLE_EVENTS.find(e => e.value === event)?.label || event}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Secret:</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {webhook.secret.substring(0, 12)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyWebhookSecret(webhook.secret)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={isTestingWebhook === webhook.id}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {isTestingWebhook === webhook.id ? 'Enviando...' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWebhook(webhook)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar webhook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El webhook será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWebhook(webhook.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {webhooks.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay webhooks configurados</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer webhook para comenzar a recibir notificaciones de eventos
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Webhook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Historial de Tests */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Historial de Tests
            </CardTitle>
            <CardDescription>
              Últimos tests de webhooks realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map(test => (
                <div key={test.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <p className="text-sm font-medium">
                        Webhook ID: {test.webhookId.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {test.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {test.responseTime && (
                      <p className="text-sm">{test.responseTime}ms</p>
                    )}
                    {test.responseCode && (
                      <p className="text-xs text-muted-foreground">
                        HTTP {test.responseCode}
                      </p>
                    )}
                    {test.error && (
                      <p className="text-xs text-red-500">{test.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}