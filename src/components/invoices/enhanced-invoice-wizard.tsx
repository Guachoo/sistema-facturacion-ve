// Enhanced Invoice Wizard with Phase 2 integrations
// Automatic IVA/IGTF calculations, TFHKA integration, fiscal compliance

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Package,
  CreditCard,
  FileText,
  Calculator,
  DollarSign,
  Percent,
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import { MoneyInput } from '@/components/ui/money-input';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { useCreateFiscalInvoice } from '@/api/invoices-extended';
import { useBcvRate } from '@/api/rates';
import { formatVES, formatUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Customer, Item, InvoiceLine, Payment, BcvRate } from '@/types';

const STEPS = [
  { id: 1, title: 'Cliente', icon: User, description: 'Seleccionar cliente' },
  { id: 2, title: 'Productos', icon: Package, description: 'Agregar items' },
  { id: 3, title: 'Fiscal', icon: Shield, description: 'Configuración fiscal' },
  { id: 4, title: 'Pagos', icon: CreditCard, description: 'Métodos de pago' },
  { id: 5, title: 'Resumen', icon: FileText, description: 'Revisar y emitir' },
];

// Validation schema for invoice data
const invoiceValidationSchema = z.object({
  cliente: z.object({
    id: z.string().min(1, 'Cliente es requerido'),
    rif: z.string().min(1, 'RIF del cliente es requerido'),
    razonSocial: z.string().min(1, 'Razón social es requerida')
  }),
  lineas: z.array(z.object({
    itemId: z.string().min(1, 'Item es requerido'),
    cantidad: z.number().min(1, 'Cantidad debe ser mayor a 0'),
    precioUnitario: z.number().min(0, 'Precio debe ser mayor o igual a 0')
  })).min(1, 'Debe agregar al menos un item'),
  fiscalOptions: z.object({
    serie: z.string().min(1, 'Serie es requerida'),
    emitirTfhka: z.boolean(),
    aplicarIgtf: z.boolean()
  })
});

// Enhanced line item with fiscal calculations
interface EnhancedInvoiceLine extends InvoiceLine {
  ivaCalculado: number;
  islrCalculado: number;
  totalConImpuestos: number;
  codigoSeniat?: string;
  categoriaSeniat?: string;
}

interface EnhancedInvoiceWizardProps {
  customer?: Customer;
  onComplete: (invoice: any) => void;
  onCancel: () => void;
}

export function EnhancedInvoiceWizard({
  customer: initialCustomer,
  onComplete,
  onCancel
}: EnhancedInvoiceWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [invoiceLines, setInvoiceLines] = useState<EnhancedInvoiceLine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fiscalOptions, setFiscalOptions] = useState({
    serie: 'A',
    emitirTfhka: true,
    aplicarIgtf: false,
    notas: ''
  });

  // BCV rate for calculations
  const { data: bcvRate, isLoading: bcvLoading } = useBcvRate();
  const createFiscalInvoiceMutation = useCreateFiscalInvoice();

  // Cast bcvRate to our specific type for type safety
  const typedBcvRate = bcvRate as BcvRate | undefined;

  // Form validation
  const {
    trigger,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(invoiceValidationSchema),
    mode: 'onChange'
  });

  // Initialize customer data when component mounts or customer changes
  useEffect(() => {
    if (initialCustomer && !selectedCustomer) {
      setSelectedCustomer(initialCustomer);
      setCurrentStep(2); // Skip to products step if customer is pre-selected
    }
  }, [initialCustomer, selectedCustomer]);

  // Calculate totals with taxes
  const calculations = useMemo(() => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + (line.cantidad * line.precioUnitario), 0);

    // IVA calculation
    const totalIva = invoiceLines.reduce((sum, line) => {
      if (line.item.ivaAplica && !line.item.exentoIva) {
        const lineSubtotal = line.cantidad * line.precioUnitario;
        const alicuota = line.item.alicuotaIva || 16;
        return sum + (lineSubtotal * alicuota / 100);
      }
      return sum;
    }, 0);

    // ISLR calculation
    const totalIslr = invoiceLines.reduce((sum, line) => {
      if (line.item.sujetoRetencionIslr) {
        const lineSubtotal = line.cantidad * line.precioUnitario;
        const porcentaje = line.item.porcentajeRetencionIslr || 0;
        return sum + (lineSubtotal * porcentaje / 100);
      }
      return sum;
    }, 0);

    const subtotalConIva = subtotal + totalIva;

    // IGTF calculation (3% on foreign currency operations)
    const totalIgtf = fiscalOptions.aplicarIgtf ? subtotalConIva * 0.03 : 0;

    const total = subtotalConIva + totalIgtf - totalIslr;
    const totalUsd = typedBcvRate?.rate ? total / typedBcvRate.rate : 0;

    return {
      subtotal,
      totalIva,
      totalIslr,
      totalIgtf,
      subtotalConIva,
      total,
      totalUsd
    };
  }, [invoiceLines, fiscalOptions.aplicarIgtf, typedBcvRate]);

  // Enhanced line calculation
  const calculateLineWithTaxes = (line: InvoiceLine): EnhancedInvoiceLine => {
    const lineSubtotal = line.cantidad * line.precioUnitario;

    // IVA calculation
    let ivaCalculado = 0;
    if (line.item.ivaAplica && !line.item.exentoIva) {
      const alicuota = line.item.alicuotaIva || 16;
      ivaCalculado = lineSubtotal * alicuota / 100;
    }

    // ISLR calculation
    let islrCalculado = 0;
    if (line.item.sujetoRetencionIslr) {
      const porcentaje = line.item.porcentajeRetencionIslr || 0;
      islrCalculado = lineSubtotal * porcentaje / 100;
    }

    const totalConImpuestos = lineSubtotal + ivaCalculado - islrCalculado;

    return {
      ...line,
      baseImponible: lineSubtotal - (line.descuento || 0),
      montoIva: ivaCalculado,
      ivaCalculado,
      islrCalculado,
      totalConImpuestos,
      codigoSeniat: line.item.codigoSeniat,
      categoriaSeniat: line.item.categoriaSeniat
    };
  };

  const addInvoiceLine = (item: Item, cantidad: number = 1) => {
    const basicLine: InvoiceLine = {
      id: crypto.randomUUID(),
      itemId: item.id || '',
      codigo: item.codigo,
      descripcion: item.descripcion,
      cantidad,
      precioUnitario: item.precioBase,
      descuento: 0,
      alicuotaIva: item.alicuotaIva || (item.ivaAplica ? 16 : 0),
      baseImponible: cantidad * item.precioBase, // Will be recalculated in calculateLineWithTaxes
      montoIva: 0, // Will be calculated in calculateLineWithTaxes
      total: cantidad * item.precioBase,
      item
    };

    const enhancedLine = calculateLineWithTaxes(basicLine);
    setInvoiceLines(prev => [...prev, enhancedLine]);
  };

  const updateInvoiceLine = (id: string, updates: Partial<InvoiceLine>) => {
    setInvoiceLines(prev => prev.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, ...updates };
        updatedLine.total = updatedLine.cantidad * updatedLine.precioUnitario - (updatedLine.descuento || 0);
        return calculateLineWithTaxes(updatedLine);
      }
      return line;
    }));
  };

  const removeInvoiceLine = (id: string) => {
    setInvoiceLines(prev => prev.filter(line => line.id !== id));
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || invoiceLines.length === 0) {
      toast.error('Faltan datos requeridos');
      return;
    }

    const invoiceData = {
      customer: selectedCustomer,
      lines: invoiceLines.map(line => ({
        item: line.item,
        cantidad: line.cantidad,
        precioUnitario: line.precioUnitario,
        descuento: line.descuento
      })),
      payments,
      notes: fiscalOptions.notas,
      serie: fiscalOptions.serie,
      emitirTfhka: fiscalOptions.emitirTfhka,
      aplicarIgtf: fiscalOptions.aplicarIgtf
    };

    createFiscalInvoiceMutation.mutate(invoiceData, {
      onSuccess: (result) => {
        toast.success('Factura fiscal creada exitosamente', {
          description: `Número: ${result.invoice.numero} | Control: ${result.fiscalData.controlNumber}`
        });
        onComplete(result);
      },
      onError: (error: any) => {
        toast.error('Error al crear la factura', {
          description: error.message || 'Verifique los datos e intente nuevamente'
        });
      }
    });
  };

  const getStepProgress = () => ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const canProceedToNext = async () => {
    switch (currentStep) {
      case 1: return selectedCustomer !== null;
      case 2:
        if (invoiceLines.length === 0) return false;
        // Trigger validation for invoice lines
        const linesValid = await trigger('lineas');
        return linesValid;
      case 3:
        // Trigger validation for fiscal options
        const fiscalValid = await trigger('fiscalOptions');
        return fiscalValid;
      case 4: return payments.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  // Handle next step with validation
  const handleNextStep = async () => {
    const canProceed = await canProceedToNext();
    if (canProceed) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error('Validación requerida', {
        description: 'Complete los campos requeridos antes de continuar'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Wizard de Facturación Fiscal
              </CardTitle>
              <CardDescription>
                Sistema avanzado con cálculos automáticos de IVA/IGTF e integración TFHKA
              </CardDescription>
            </div>
            <BcvRateBadge />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={getStepProgress()} className="w-full" />
            <div className="flex justify-between">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div className={`
                      rounded-full w-10 h-10 flex items-center justify-center border-2
                      ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                        isActive ? 'bg-primary border-primary text-primary-foreground' :
                        'bg-muted border-muted-foreground/30 text-muted-foreground'}
                    `}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seleccionar Cliente
                </CardTitle>
                <CardDescription>
                  El cliente debe estar registrado y con RIF validado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCustomer ? (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Selección de Cliente Requerida</AlertTitle>
                      <AlertDescription>
                        Debe seleccionar un cliente válido con RIF registrado para continuar con la facturación.
                      </AlertDescription>
                    </Alert>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Demo: seleccionar cliente de ejemplo
                        const demoCustomer: Customer = {
                          id: 'demo-customer-1',
                          rif: 'J-12345678-9',
                          razonSocial: 'Cliente de Ejemplo C.A.',
                          email: 'cliente@ejemplo.com',
                          telefono: '+58-212-555-0123',
                          domicilio: 'Caracas, Venezuela',
                          tipoContribuyente: 'ordinario'
                        };
                        setSelectedCustomer(demoCustomer);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Seleccionar Cliente de Ejemplo
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-green-800">Cliente Seleccionado</h4>
                    </div>
                    <div className="text-sm text-green-700">
                      <p><strong>RIF:</strong> {selectedCustomer.rif}</p>
                      <p><strong>Razón Social:</strong> {selectedCustomer.razonSocial}</p>
                      <p><strong>Email:</strong> {selectedCustomer.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Cambiar Cliente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos y Servicios
                </CardTitle>
                <CardDescription>
                  Los cálculos de IVA e ISLR se realizan automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Información sobre tasa BCV */}
                {typedBcvRate && (
                  <Alert className="mb-4">
                    <DollarSign className="h-4 w-4" />
                    <AlertTitle>Tasa BCV Activa</AlertTitle>
                    <AlertDescription>
                      Tasa oficial BCV: {formatVES(typedBcvRate.rate)} VES por USD - Actualizada: {new Date(typedBcvRate.date).toLocaleDateString('es-VE')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta informativa sobre cálculos automáticos */}
                {invoiceLines.length === 0 && (
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Información</AlertTitle>
                    <AlertDescription>
                      Una vez que agregue productos, los cálculos de IVA, ISLR e IGTF se realizarán automáticamente según la configuración fiscal de cada item.
                    </AlertDescription>
                  </Alert>
                )}

                {invoiceLines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>IVA</TableHead>
                        <TableHead>ISLR</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.item.descripcion}</p>
                              <div className="flex gap-1 mt-1">
                                {line.codigoSeniat && (
                                  <Badge variant="outline" className="text-xs">
                                    {line.codigoSeniat}
                                  </Badge>
                                )}
                                {line.categoriaSeniat && (
                                  <Badge variant="secondary" className="text-xs">
                                    {line.categoriaSeniat}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.cantidad}
                              onChange={(e) => updateInvoiceLine(line.id, { cantidad: Number(e.target.value) })}
                              className="w-20"
                              min="0.01"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <MoneyInput
                              value={line.precioUnitario}
                              onChange={(value) => updateInvoiceLine(line.id, { precioUnitario: value })}
                              currency="VES"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {line.item.ivaAplica && !line.item.exentoIva ? (
                                <>
                                  <div className="font-medium">{formatVES(line.ivaCalculado)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {line.item.alicuotaIva || 16}%
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Exento</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {line.item.sujetoRetencionIslr ? (
                                <>
                                  <div className="font-medium text-red-600">-{formatVES(line.islrCalculado)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {line.item.porcentajeRetencionIslr || 0}%
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatVES(line.totalConImpuestos)}</div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvoiceLine(line.id)}
                            >
                              ×
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No hay productos agregados</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Demo: agregar línea de ejemplo
                        const demoItem: Item = {
                          id: 'demo-1',
                          codigo: 'DEMO-001',
                          descripcion: 'Producto de Ejemplo',
                          tipo: 'producto',
                          precioBase: 100,
                          ivaAplica: true,
                          alicuotaIva: 16,
                          activo: true
                        };
                        addInvoiceLine(demoItem, 1);
                      }}
                    >
                      Agregar Producto de Ejemplo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuración Fiscal
                </CardTitle>
                <CardDescription>
                  Opciones avanzadas de facturación fiscal venezolana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Advertencia sobre IGTF */}
                {fiscalOptions.aplicarIgtf && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Aplicación de IGTF</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      Se aplicará el 3% de IGTF a esta factura. Verifique que el cliente esté obligado a este impuesto.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Información sobre errores de validación */}
                {Object.keys(errors).length > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">Errores de Validación</AlertTitle>
                    <AlertDescription className="text-red-700">
                      Por favor revise y corrija los errores antes de continuar.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie">Serie de Facturación</Label>
                    <Select
                      value={fiscalOptions.serie}
                      onValueChange={(value) => setFiscalOptions(prev => ({ ...prev, serie: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Serie A - General</SelectItem>
                        <SelectItem value="B">Serie B - Exportación</SelectItem>
                        <SelectItem value="C">Serie C - Especial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Emisión TFHKA
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enviar documento al sistema fiscal TFHKA automáticamente
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={fiscalOptions.emitirTfhka}
                      onChange={(e) => setFiscalOptions(prev => ({ ...prev, emitirTfhka: e.target.checked }))}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Aplicar IGTF (3%)
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Impuesto a las Grandes Transacciones Financieras
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={fiscalOptions.aplicarIgtf}
                      onChange={(e) => setFiscalOptions(prev => ({ ...prev, aplicarIgtf: e.target.checked }))}
                      className="w-4 h-4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas Adicionales</Label>
                  <textarea
                    id="notas"
                    value={fiscalOptions.notas}
                    onChange={(e) => setFiscalOptions(prev => ({ ...prev, notas: e.target.value }))}
                    className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                    placeholder="Observaciones o notas para la factura..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Métodos de Pago
                </CardTitle>
                <CardDescription>
                  Configure los métodos de pago para esta factura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alert informativo sobre pagos */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Métodos de Pago Disponibles</AlertTitle>
                  <AlertDescription>
                    Seleccione el método de pago utilizado. Los pagos en efectivo están limitados según regulaciones BCV.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const newPayment: Payment = {
                        id: crypto.randomUUID(),
                        tipo: 'transferencia_ves',
                        monto: calculations.total,
                        aplicaIgtf: fiscalOptions.aplicarIgtf
                      };
                      setPayments([newPayment]);
                    }}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Pago en Efectivo
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const newPayment: Payment = {
                        id: crypto.randomUUID(),
                        tipo: 'transferencia_ves',
                        monto: calculations.total,
                        aplicaIgtf: fiscalOptions.aplicarIgtf
                      };
                      setPayments([newPayment]);
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Transferencia Bancaria
                  </Button>
                </div>

                {payments.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Método de pago seleccionado: {payments[0]?.tipo} - {formatVES(payments[0]?.monto || 0)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumen Final
                </CardTitle>
                <CardDescription>
                  Revise todos los datos antes de emitir la factura fiscal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCustomer && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium">Cliente</h4>
                    <p>{selectedCustomer.razonSocial}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.rif}</p>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Resumen de Impuestos</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Subtotal:</div>
                    <div className="text-right">{formatVES(calculations.subtotal)}</div>
                    <div>IVA Total:</div>
                    <div className="text-right">{formatVES(calculations.totalIva)}</div>
                    {calculations.totalIslr > 0 && (
                      <>
                        <div>ISLR (Retención):</div>
                        <div className="text-right text-red-600">-{formatVES(calculations.totalIslr)}</div>
                      </>
                    )}
                    {calculations.totalIgtf > 0 && (
                      <>
                        <div>IGTF (3%):</div>
                        <div className="text-right">{formatVES(calculations.totalIgtf)}</div>
                      </>
                    )}
                    <Separator className="col-span-2" />
                    <div className="font-bold">Total VES:</div>
                    <div className="text-right font-bold">{formatVES(calculations.total)}</div>
                    <div className="font-bold">Total USD:</div>
                    <div className="text-right font-bold">{formatUSD(calculations.totalUsd)}</div>
                  </div>
                </div>

                {fiscalOptions.emitirTfhka && (
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertTitle>Emisión TFHKA Activada</AlertTitle>
                    <AlertDescription>
                      Esta factura será enviada automáticamente al sistema fiscal TFHKA tras la creación.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cálculos Fiscales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bcvLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando tasa BCV...</span>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatVES(calculations.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span>{formatVES(calculations.totalIva)}</span>
                  </div>
                  {calculations.totalIslr > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>ISLR:</span>
                      <span>-{formatVES(calculations.totalIslr)}</span>
                    </div>
                  )}
                  {calculations.totalIgtf > 0 && (
                    <div className="flex justify-between">
                      <span>IGTF:</span>
                      <span>{formatVES(calculations.totalIgtf)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total VES:</span>
                    <span>{formatVES(calculations.total)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total USD:</span>
                    <span>{formatUSD(calculations.totalUsd)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                {currentStep < STEPS.length && (
                  <Button
                    onClick={handleNextStep}
                    className="w-full"
                  >
                    {currentStep === STEPS.length ? 'Emitir Factura' : 'Siguiente'}
                  </Button>
                )}

                {currentStep === STEPS.length && (
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={createFiscalInvoiceMutation.isPending}
                    className="w-full"
                  >
                    {createFiscalInvoiceMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando Factura...
                      </>
                    ) : (
                      'Emitir Factura Fiscal'
                    )}
                  </Button>
                )}

                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="w-full"
                  >
                    Anterior
                  </Button>
                )}

                <Button variant="ghost" onClick={onCancel} className="w-full">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}