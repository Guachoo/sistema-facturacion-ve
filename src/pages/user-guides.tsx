import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Book,
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  Settings,
  HelpCircle,
  Download,
  Play,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Search,
  Video,
  ExternalLink
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  steps: GuideStep[];
}

interface GuideStep {
  title: string;
  content: string;
  type: 'text' | 'code' | 'image' | 'video' | 'warning' | 'tip';
  code?: string;
  image?: string;
  video?: string;
}

const USER_GUIDES: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Primeros Pasos',
    description: 'Configuración inicial y primeras operaciones del sistema',
    level: 'beginner',
    estimatedTime: '15 minutos',
    steps: [
      {
        title: 'Primer acceso al sistema',
        content: 'Una vez que el administrador le proporcione sus credenciales, podrá acceder al sistema. Use las siguientes credenciales para la demostración:',
        type: 'text'
      },
      {
        title: 'Credenciales de demostración',
        content: 'Utilice estas credenciales para acceder al sistema de demostración',
        type: 'code',
        code: `Email: admin@sistema.com
Contraseña: admin123

Para el entorno de producción, el administrador le proporcionará credenciales únicas.`
      },
      {
        title: 'Configurar perfil de usuario',
        content: 'Después del primer acceso, es recomendable actualizar su información personal y cambiar la contraseña.',
        type: 'text'
      },
      {
        title: 'Verificar permisos asignados',
        content: 'Verifique qué módulos puede acceder según los permisos asignados por el administrador. Los módulos disponibles aparecerán en el menú lateral.',
        type: 'text'
      },
      {
        title: '⚠️ Seguridad importante',
        content: 'Nunca comparta sus credenciales con otras personas. El sistema registra todas las actividades para auditoría.',
        type: 'warning'
      }
    ]
  },
  {
    id: 'customer-management',
    title: 'Gestión de Clientes',
    description: 'Cómo crear, editar y administrar la información de clientes',
    level: 'beginner',
    estimatedTime: '10 minutos',
    steps: [
      {
        title: 'Acceder al módulo de clientes',
        content: 'Navegue al módulo "Clientes & CRM" desde el menú lateral. Aquí podrá ver todos los clientes registrados.',
        type: 'text'
      },
      {
        title: 'Crear un nuevo cliente',
        content: 'Haga clic en el botón "Nuevo Cliente" y complete la información requerida. Los campos marcados con * son obligatorios.',
        type: 'text'
      },
      {
        title: 'Validación automática de RIF',
        content: 'El sistema valida automáticamente el formato del RIF venezolano. Asegúrese de usar el formato correcto:',
        type: 'code',
        code: `Ejemplos de RIF válidos:
- V-12345678-9 (Persona Natural)
- E-12345678-9 (Extranjero)
- J-12345678-9 (Persona Jurídica)
- P-12345678-9 (Pasaporte)
- G-12345678-9 (Gobierno)`
      },
      {
        title: 'Tipos de clientes',
        content: 'Seleccione el tipo correcto según corresponda: Natural (personas) o Jurídico (empresas). Esto afecta las validaciones fiscales.',
        type: 'text'
      },
      {
        title: '💡 Consejo útil',
        content: 'Active "Contribuyente Especial" solo para clientes que tengan esta designación oficial del SENIAT.',
        type: 'tip'
      },
      {
        title: 'Editar información existente',
        content: 'Para modificar un cliente, haga clic en el ícono de edición en la lista. Los cambios se guardan automáticamente.',
        type: 'text'
      }
    ]
  },
  {
    id: 'invoice-creation',
    title: 'Creación de Facturas',
    description: 'Proceso completo para emitir facturas electrónicas',
    level: 'intermediate',
    estimatedTime: '20 minutos',
    steps: [
      {
        title: 'Verificar configuración previa',
        content: 'Antes de crear facturas, asegúrese de tener configurados: empresa emisora, series de facturación, y clientes registrados.',
        type: 'text'
      },
      {
        title: 'Iniciar nueva factura',
        content: 'Vaya a "Facturas" → "Nueva Factura" o use el asistente de facturación. Seleccione el cliente desde la lista.',
        type: 'text'
      },
      {
        title: 'Configurar datos fiscales',
        content: 'Complete la información fiscal requerida:',
        type: 'code',
        code: `Datos requeridos:
- Fecha de emisión (automática, puede modificarse)
- Moneda (VES o USD)
- Tasa BCV (se actualiza automáticamente)
- Serie de facturación (si aplica)
- Número de control (generado automáticamente)`
      },
      {
        title: 'Agregar productos/servicios',
        content: 'Agregue los items de la factura. Puede seleccionar desde el catálogo o crear items nuevos sobre la marcha.',
        type: 'text'
      },
      {
        title: 'Cálculos automáticos',
        content: 'El sistema calcula automáticamente: subtotal, IVA (16%), IGTF (3% para USD), y total. Verifique que los montos sean correctos.',
        type: 'text'
      },
      {
        title: '⚠️ Importante sobre IGTF',
        content: 'El IGTF (3%) se aplica automáticamente solo a transacciones en moneda extranjera (USD). No aplica para VES.',
        type: 'warning'
      },
      {
        title: 'Revisar y emitir',
        content: 'Revise todos los datos antes de emitir. Una vez emitida, la factura obtendrá su número de control definitivo.',
        type: 'text'
      },
      {
        title: '💡 Consejo para facturación en USD',
        content: 'Para facturas en USD, el sistema convierte automáticamente a VES usando la tasa BCV del día. Ambos montos aparecen en la factura.',
        type: 'tip'
      }
    ]
  },
  {
    id: 'tax-compliance',
    title: 'Cumplimiento Fiscal',
    description: 'Configuraciones y procesos para cumplir con las normativas del SENIAT',
    level: 'advanced',
    estimatedTime: '30 minutos',
    steps: [
      {
        title: 'Configuración de empresa',
        content: 'Asegúrese de que la información de su empresa esté completa y correcta en Configuración → Empresa.',
        type: 'text'
      },
      {
        title: 'Series de facturación',
        content: 'Configure las series según los requisitos del SENIAT:',
        type: 'code',
        code: `Series recomendadas:
- F: Facturas normales
- NC: Notas de crédito
- ND: Notas de débito
- R: Facturas de retención (si aplica)

Cada serie debe tener numeración consecutiva.`
      },
      {
        title: 'Números de control',
        content: 'Los números de control se generan automáticamente y deben ser consecutivos. El sistema los administra automáticamente.',
        type: 'text'
      },
      {
        title: 'Tipos de IVA',
        content: 'Configure correctamente los tipos de IVA según los productos:',
        type: 'code',
        code: `Tipos de IVA en Venezuela:
- General: 16% (mayoría de productos/servicios)
- Reducido: 8% (algunos alimentos básicos)
- Exento: 0% (medicinas, libros, etc.)

Consulte la lista oficial del SENIAT para productos específicos.`
      },
      {
        title: 'Reportes fiscales',
        content: 'Genere los reportes requeridos desde el módulo "Reportes": Libro de Ventas, Reporte de IVA, Análisis Fiscal.',
        type: 'text'
      },
      {
        title: '⚠️ Respaldo de información',
        content: 'Mantenga respaldos regulares de su información fiscal. El sistema incluye funciones de backup automático.',
        type: 'warning'
      },
      {
        title: 'Auditoría y trazabilidad',
        content: 'El sistema registra automáticamente todas las operaciones para auditoría. Revise el dashboard de auditoría regularmente.',
        type: 'text'
      }
    ]
  },
  {
    id: 'multi-company',
    title: 'Gestión Multi-empresa',
    description: 'Configuración y administración de múltiples empresas',
    level: 'advanced',
    estimatedTime: '25 minutos',
    steps: [
      {
        title: 'Concepto de multi-empresa',
        content: 'El sistema permite manejar múltiples empresas desde una sola instalación, cada una con su propia configuración fiscal.',
        type: 'text'
      },
      {
        title: 'Configurar empresa principal',
        content: 'La empresa principal ya está configurada. Para agregar empresas adicionales, vaya a Multi-empresa → Configuración.',
        type: 'text'
      },
      {
        title: 'Agregar empresas subsidiarias',
        content: 'Complete la información fiscal de cada empresa subsidiaria:',
        type: 'code',
        code: `Información requerida por empresa:
- RIF único
- Razón social
- Dirección fiscal
- Teléfonos de contacto
- Series de facturación independientes
- Configuración de impuestos específica`
      },
      {
        title: 'Permisos por empresa',
        content: 'Configure qué usuarios pueden acceder a cada empresa en Multi-empresa → Usuarios. Los permisos se asignan por empresa.',
        type: 'text'
      },
      {
        title: 'Cambiar entre empresas',
        content: 'Use el selector de empresas en la parte superior para cambiar entre las empresas a las que tiene acceso.',
        type: 'text'
      },
      {
        title: '💡 Buena práctica',
        content: 'Mantenga la contabilidad de cada empresa completamente separada. El sistema garantiza la independencia de los datos.',
        type: 'tip'
      }
    ]
  }
];

const FAQ_ITEMS = [
  {
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Vaya a su perfil haciendo clic en su nombre en la esquina superior derecha, luego seleccione "Cambiar contraseña". Ingrese su contraseña actual y la nueva contraseña dos veces para confirmar.'
  },
  {
    question: '¿Por qué no puedo acceder a ciertos módulos?',
    answer: 'El acceso a los módulos depende de los permisos asignados por el administrador. Si necesita acceso adicional, contacte al administrador del sistema.'
  },
  {
    question: '¿Cómo anulo una factura emitida incorrectamente?',
    answer: 'Las facturas emitidas no se pueden eliminar por requerimientos fiscales. Debe emitir una Nota de Crédito para anular el efecto de la factura original.'
  },
  {
    question: '¿El sistema calcula automáticamente el IGTF?',
    answer: 'Sí, el IGTF (3%) se calcula automáticamente para todas las transacciones en moneda extranjera (USD). Para transacciones en VES no aplica IGTF.'
  },
  {
    question: '¿Cómo actualizo la tasa BCV?',
    answer: 'La tasa BCV se actualiza automáticamente cada día. También puede actualizarla manualmente desde Configuración → Tasas BCV si tiene los permisos necesarios.'
  },
  {
    question: '¿Puedo importar clientes desde Excel?',
    answer: 'Sí, el sistema incluye una función de importación desde Excel. Vaya a Clientes → Importar y descargue la plantilla para ver el formato requerido.'
  },
  {
    question: '¿Cómo genero el Libro de Ventas para el SENIAT?',
    answer: 'Vaya a Reportes → Libro de Ventas, seleccione el período deseado y genere el reporte. Puede exportarlo en formato Excel para enviarlo al SENIAT.'
  },
  {
    question: '¿Qué hacer si el sistema está lento?',
    answer: 'Verifique su conexión a internet. Si el problema persiste, contacte al soporte técnico. El sistema incluye monitoreo de rendimiento automático.'
  }
];

const CONFIGURATION_GUIDES = [
  {
    title: 'Configuración Inicial del Sistema',
    description: 'Pasos esenciales después de la instalación',
    steps: [
      'Configurar información de la empresa emisora',
      'Definir series de facturación',
      'Configurar tipos de IVA según productos',
      'Crear usuarios y asignar permisos',
      'Configurar respaldos automáticos',
      'Probar emisión de facturas de prueba'
    ]
  },
  {
    title: 'Configuración de Integraciones',
    description: 'Conectar con sistemas externos',
    steps: [
      'Generar API Keys para integraciones',
      'Configurar webhooks para notificaciones',
      'Probar conexiones con sistemas externos',
      'Configurar rate limits apropiados',
      'Documentar endpoints utilizados'
    ]
  },
  {
    title: 'Configuración de Seguridad',
    description: 'Configuraciones avanzadas de seguridad',
    steps: [
      'Habilitar autenticación de dos factores',
      'Configurar políticas de contraseñas',
      'Definir horarios de acceso permitidos',
      'Configurar alertas de seguridad',
      'Revisar logs de auditoría regularmente'
    ]
  }
];

export function UserGuidesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const filteredGuides = USER_GUIDES.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || guide.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const LevelBadge = ({ level }: { level: string }) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };

    const labels = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado'
    };

    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {labels[level as keyof typeof labels]}
      </Badge>
    );
  };

  const StepContent = ({ step }: { step: GuideStep }) => {
    switch (step.type) {
      case 'code':
        return (
          <div className="bg-muted p-4 rounded font-mono text-sm">
            <pre className="whitespace-pre-wrap">{step.code}</pre>
          </div>
        );
      case 'warning':
        return (
          <div className="bg-red-50 border border-red-200 p-4 rounded flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-red-800">{step.content}</div>
          </div>
        );
      case 'tip':
        return (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800">{step.content}</div>
          </div>
        );
      default:
        return <p className="text-muted-foreground">{step.content}</p>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guías de Usuario</h1>
          <p className="text-muted-foreground">
            Documentación completa y guías paso a paso para usar el sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Video className="h-4 w-4 mr-2" />
            Video Tutoriales
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="guides" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="guides">Guías Paso a Paso</TabsTrigger>
          <TabsTrigger value="faq">Preguntas Frecuentes</TabsTrigger>
          <TabsTrigger value="configuration">Configuración</TabsTrigger>
          <TabsTrigger value="support">Soporte</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar en las guías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todos los niveles</option>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>

          <div className="grid gap-4">
            {filteredGuides.map((guide) => (
              <Card key={guide.id}>
                <Collapsible
                  open={expandedSections.has(guide.id)}
                  onOpenChange={() => toggleSection(guide.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Book className="h-5 w-5" />
                          <div className="text-left">
                            <CardTitle className="text-lg">{guide.title}</CardTitle>
                            <CardDescription>{guide.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <LevelBadge level={guide.level} />
                          <Badge variant="outline">{guide.estimatedTime}</Badge>
                          {expandedSections.has(guide.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {guide.steps.map((step, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold">{step.title}</h4>
                          </div>
                          <div className="ml-11">
                            <StepContent step={step} />
                          </div>
                          {index < guide.steps.length - 1 && (
                            <Separator className="ml-11" />
                          )}
                        </div>
                      ))}
                      <div className="ml-11 pt-4">
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como completado
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Preguntas Frecuentes
              </CardTitle>
              <CardDescription>
                Respuestas a las dudas más comunes sobre el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FAQ_ITEMS.map((item, index) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-muted/50">
                        <h4 className="font-medium text-left">{item.question}</h4>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-l-4 border-blue-200 bg-blue-50 mt-2 rounded-r">
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <div className="grid gap-4">
            {CONFIGURATION_GUIDES.map((guide, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {guide.title}
                  </CardTitle>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {guide.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs">
                          {stepIndex + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contacto de Soporte</CardTitle>
                <CardDescription>
                  Canales disponibles para obtener ayuda técnica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Soporte Técnico</h4>
                  <p className="text-sm text-muted-foreground">
                    📧 soporte@sistemavenezuela.com<br />
                    📞 +58-212-SOPORTE (762-6783)<br />
                    💬 Chat en vivo (Lunes a Viernes 8AM-6PM)
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Soporte Fiscal</h4>
                  <p className="text-sm text-muted-foreground">
                    📧 fiscal@sistemavenezuela.com<br />
                    📞 +58-212-FISCAL (347-2251)<br />
                    🕒 Lunes a Viernes 9AM-5PM
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Emergencias</h4>
                  <p className="text-sm text-muted-foreground">
                    🚨 +58-414-URGENTE (874-3683)<br />
                    📱 Solo para problemas críticos 24/7
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recursos Adicionales</CardTitle>
                <CardDescription>
                  Otros recursos útiles para usar el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Video className="h-4 w-4 mr-2" />
                  Videos tutoriales en YouTube
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Manual técnico completo (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Portal de conocimiento
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Comunidad de usuarios
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sistema de Tickets</CardTitle>
              <CardDescription>
                Reporte problemas o solicite nuevas funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Button className="h-24 flex-col">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  <span>Reportar Bug</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Lightbulb className="h-6 w-6 mb-2" />
                  <span>Sugerir Mejora</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <HelpCircle className="h-6 w-6 mb-2" />
                  <span>Consulta General</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}