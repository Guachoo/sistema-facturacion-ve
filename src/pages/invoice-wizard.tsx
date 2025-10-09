import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  User, 
  Package, 
  CreditCard, 
  FileText,
  Download,
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { useCustomers, useCreateCustomer } from '@/api/customers';
import { useItems } from '@/api/items';
import { useCreateInvoice } from '@/api/invoices';
import { useBcvRate } from '@/api/rates';
import { MoneyInput } from '@/components/ui/money-input';
import { RifInput } from '@/components/ui/rif-input';
import { BcvRateBadge } from '@/components/ui/bcv-rate-badge';
import { formatVES, formatUSD, calculateIVA, calculateIGTF, validateRIF } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Customer, Item, InvoiceLine, Payment, Invoice } from '@/types';

const quickCustomerSchema = z.object({
  rif: z.string().min(1, 'RIF es requerido').refine(validateRIF, 'Formato de RIF inválido'),
  razonSocial: z.string().min(1, 'Razón social es requerida'),
  domicilio: z.string().min(1, 'Domicilio es requerido'),
  esContribuyenteEspecial: z.boolean(),
  esAgenteRetencion: z.boolean(),
});

type QuickCustomerForm = z.infer<typeof quickCustomerSchema>;

const STEPS = [
  { id: 1, title: 'Cliente', icon: User },
  { id: 2, title: 'Productos', icon: Package },
  { id: 3, title: 'Pagos', icon: CreditCard },
  { id: 4, title: 'Resumen', icon: FileText },
];

export function InvoiceWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  const { data: customers = [] } = useCustomers();
  const { data: items = [] } = useItems();
  const { data: bcvRate } = useBcvRate();
  const createInvoiceMutation = useCreateInvoice();
  const createCustomerMutation = useCreateCustomer();

  const {
    register: registerCustomer,
    handleSubmit: handleSubmitCustomer,
    reset: resetCustomer,
    setValue: setCustomerValue,
    watch: watchCustomer,
    formState: { errors: customerErrors },
  } = useForm<QuickCustomerForm>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: {
      esContribuyenteEspecial: false,
      esAgenteRetencion: false,
    },
  });

  const filteredCustomers = customers.filter(customer =>
    customer.razonSocial.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.rif.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredItems = items.filter(item =>
    item.descripcion.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.codigo.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // Calculations
  const subtotal = invoiceLines.reduce((sum, line) => sum + line.baseImponible, 0);
  const totalIva = invoiceLines.reduce((sum, line) => sum + line.montoIva, 0);
  const totalIgtf = payments.reduce((sum, payment) => sum + (payment.montoIgtf || 0), 0);
  const total = subtotal + totalIva + totalIgtf;
  const totalUsdReferencia = bcvRate ? total / bcvRate.rate : 0;

  const addInvoiceLine = (item: Item) => {
    const existingLine = invoiceLines.find(line => line.itemId === item.id);
    if (existingLine) {
      updateInvoiceLine(existingLine.itemId, { cantidad: existingLine.cantidad + 1 });
    } else {
      const baseImponible = item.precioBase;
      const montoIva = item.ivaAplica ? calculateIVA(baseImponible) : 0;
      
      const newLine: InvoiceLine = {
        itemId: item.id!,
        codigo: item.codigo,
        descripcion: item.descripcion,
        cantidad: 1,
        precioUnitario: item.precioBase,
        descuento: 0,
        baseImponible,
        montoIva,
      };
      
      setInvoiceLines([...invoiceLines, newLine]);
    }
  };

  const updateInvoiceLine = (itemId: string, updates: Partial<InvoiceLine>) => {
    setInvoiceLines(lines =>
      lines.map(line => {
        if (line.itemId === itemId) {
          const updatedLine = { ...line, ...updates };
          const baseImponible = updatedLine.cantidad * updatedLine.precioUnitario * (1 - updatedLine.descuento / 100);
          const item = items.find(i => i.id === itemId);
          const montoIva = item?.ivaAplica ? calculateIVA(baseImponible) : 0;
          
          return {
            ...updatedLine,
            baseImponible,
            montoIva,
          };
        }
        return line;
      })
    );
  };

  const removeInvoiceLine = (itemId: string) => {
    setInvoiceLines(lines => lines.filter(line => line.itemId !== itemId));
  };

  const addPayment = () => {
    const newPayment: Payment = {
      tipo: 'transferencia_ves',
      monto: total - payments.reduce((sum, p) => sum + p.monto, 0),
      aplicaIgtf: false,
    };
    setPayments([...payments, newPayment]);
  };

  const updatePayment = (index: number, updates: Partial<Payment>) => {
    setPayments(payments =>
      payments.map((payment, i) => {
        if (i === index) {
          const updatedPayment = { ...payment, ...updates };
          const montoIgtf = updatedPayment.aplicaIgtf ? calculateIGTF(updatedPayment.monto, updatedPayment.tipo) : 0;
          return { ...updatedPayment, montoIgtf };
        }
        return payment;
      })
    );
  };

  const removePayment = (index: number) => {
    setPayments(payments => payments.filter((_, i) => i !== index));
  };

  const onQuickCustomerSubmit = (data: QuickCustomerForm) => {
    createCustomerMutation.mutate(data, {
      onSuccess: (newCustomer) => {
        setSelectedCustomer(newCustomer);
        setIsQuickCustomerOpen(false);
        resetCustomer();
        toast.success('Cliente creado correctamente');
      },
      onError: () => {
        toast.error('Error al crear el cliente');
      },
    });
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return selectedCustomer !== null;
      case 3:
        return invoiceLines.length > 0;
      case 4:
        return payments.length > 0 && Math.abs(payments.reduce((sum, p) => sum + p.monto, 0) - total) < 0.01;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error('Completa todos los campos requeridos antes de continuar');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmitInvoice = () => {
    if (!selectedCustomer || !bcvRate) return;

    const invoiceData: Omit<Invoice, 'id' | 'numero' | 'numeroControl'> = {
      fecha: new Date().toISOString(),
      emisor: {
        nombre: 'Axiona, C.A.',
        rif: 'J-12345678-9',
        domicilio: 'Caracas, Venezuela'
      },
      receptor: selectedCustomer,
      lineas: invoiceLines,
      pagos: payments,
      subtotal,
      montoIva: totalIva,
      montoIgtf: totalIgtf,
      total,
      totalUsdReferencia,
      tasaBcv: bcvRate.rate,
      fechaTasaBcv: bcvRate.date,
      canal: 'digital',
      estado: 'emitida',
    };

    createInvoiceMutation.mutate(invoiceData, {
      onSuccess: (invoice) => {
        toast.success(`Factura ${invoice.numero} emitida correctamente`);
        navigate('/facturas');
      },
      onError: () => {
        toast.error('Error al emitir la factura');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Factura</h1>
          <p className="text-muted-foreground">
            Wizard de creación de factura digital
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Steps Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pasos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const canAccess = step.id === 1 || canProceedToStep(step.id);

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : canAccess
                        ? 'hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canAccess && setCurrentStep(step.id)}
                  >
                    <div className={`p-2 rounded-full ${
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : isCompleted
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-muted'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Totals Preview */}
          {invoiceLines.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Totales</CardTitle>
                <BcvRateBadge />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatVES(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span className="font-mono">{formatVES(totalIva)}</span>
                </div>
                {totalIgtf > 0 && (
                  <div className="flex justify-between">
                    <span>IGTF (3%):</span>
                    <span className="font-mono">{formatVES(totalIgtf)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total VES:</span>
                  <span className="font-mono">{formatVES(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Ref. USD:</span>
                  <span className="font-mono">{formatUSD(totalUsdReferencia)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Paso {currentStep}: {STEPS.find(s => s.id === currentStep)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step 1: Customer Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Seleccionar Cliente</h3>
                    <Dialog open={isQuickCustomerOpen} onOpenChange={setIsQuickCustomerOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Cliente Rápido
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Cliente Rápido</DialogTitle>
                          <DialogDescription>
                            Crea un cliente con los datos básicos requeridos
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitCustomer(onQuickCustomerSubmit)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="rif">RIF *</Label>
                            <RifInput
                              id="rif"
                              value={watchCustomer('rif') || ''}
                              onChange={(value) => setCustomerValue('rif', value)}
                            />
                            {customerErrors.rif && (
                              <p className="text-sm text-destructive">{customerErrors.rif.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="razonSocial">Razón Social *</Label>
                            <Input
                              id="razonSocial"
                              {...registerCustomer('razonSocial')}
                            />
                            {customerErrors.razonSocial && (
                              <p className="text-sm text-destructive">{customerErrors.razonSocial.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="domicilio">Domicilio *</Label>
                            <Input
                              id="domicilio"
                              {...registerCustomer('domicilio')}
                            />
                            {customerErrors.domicilio && (
                              <p className="text-sm text-destructive">{customerErrors.domicilio.message}</p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsQuickCustomerOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={createCustomerMutation.isPending}>
                              Crear Cliente
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {selectedCustomer ? (
                    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{selectedCustomer.razonSocial}</h4>
                            <p className="text-sm text-muted-foreground font-mono">{selectedCustomer.rif}</p>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.domicilio}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCustomer(null)}
                          >
                            Cambiar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        placeholder="Buscar cliente por nombre o RIF..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredCustomers.map((customer) => (
                          <Card
                            key={customer.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{customer.razonSocial}</h4>
                                  <p className="text-sm text-muted-foreground font-mono">{customer.rif}</p>
                                </div>
                                <div className="flex gap-1">
                                  {customer.esContribuyenteEspecial && (
                                    <Badge variant="secondary" className="text-xs">C.E.</Badge>
                                  )}
                                  {customer.esAgenteRetencion && (
                                    <Badge variant="secondary" className="text-xs">A.R.</Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Items */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Agregar Productos/Servicios</h3>
                  </div>

                  {invoiceLines.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Líneas de Factura</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Cant.</TableHead>
                            <TableHead>Precio Unit.</TableHead>
                            <TableHead>Desc. %</TableHead>
                            <TableHead>Base Imp.</TableHead>
                            <TableHead>IVA</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceLines.map((line) => (
                            <TableRow key={line.itemId}>
                              <TableCell className="font-mono">{line.codigo}</TableCell>
                              <TableCell>{line.descripcion}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={line.cantidad}
                                  onChange={(e) => updateInvoiceLine(line.itemId, { cantidad: parseInt(e.target.value) || 1 })}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <MoneyInput
                                  value={line.precioUnitario}
                                  onChange={(value) => updateInvoiceLine(line.itemId, { precioUnitario: value })}
                                  className="w-32"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.descuento}
                                  onChange={(e) => updateInvoiceLine(line.itemId, { descuento: parseFloat(e.target.value) || 0 })}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell className="font-mono">{formatVES(line.baseImponible)}</TableCell>
                              <TableCell className="font-mono">{formatVES(line.montoIva)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeInvoiceLine(line.itemId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-medium">Catálogo de Productos/Servicios</h4>
                    <Input
                      placeholder="Buscar producto o servicio..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredItems.map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => addInvoiceLine(item)}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{item.descripcion}</h4>
                                <p className="text-sm text-muted-foreground font-mono">{item.codigo}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono">{formatVES(item.precioBase)}</p>
                                <div className="flex gap-1">
                                  <Badge variant={item.tipo === 'producto' ? 'default' : 'secondary'}>
                                    {item.tipo}
                                  </Badge>
                                  {item.ivaAplica && (
                                    <Badge variant="outline">IVA</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payments */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Formas de Pago</h3>
                    <Button onClick={addPayment}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Pago
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {payments.map((payment, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label>Tipo de Pago</Label>
                              <Select
                                value={payment.tipo}
                                onValueChange={(value) => updatePayment(index, { tipo: value as Payment['tipo'] })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="transferencia_ves">Transferencia VES</SelectItem>
                                  <SelectItem value="usd_cash">USD Efectivo</SelectItem>
                                  <SelectItem value="zelle">Zelle</SelectItem>
                                  <SelectItem value="mixto">Mixto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Monto (VES)</Label>
                              <MoneyInput
                                value={payment.monto}
                                onChange={(value) => updatePayment(index, { monto: value })}
                              />
                            </div>
                            {payment.tipo !== 'transferencia_ves' && (
                              <div className="space-y-2">
                                <Label>Monto USD (Ref.)</Label>
                                <MoneyInput
                                  value={payment.montoUsd || 0}
                                  onChange={(value) => updatePayment(index, { montoUsd: value })}
                                />
                              </div>
                            )}
                            <div className="flex items-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePayment(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {(payment.tipo === 'usd_cash' || payment.tipo === 'zelle') && (
                            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">IGTF (3%)</span>
                                <span className="font-mono">{formatVES(payment.montoIgtf || 0)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Impuesto aplicable a transacciones en divisas
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {payments.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total a Pagar:</span>
                            <span className="font-mono font-bold">{formatVES(total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Pagos:</span>
                            <span className="font-mono">{formatVES(payments.reduce((sum, p) => sum + p.monto, 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Diferencia:</span>
                            <span className={`font-mono ${Math.abs(payments.reduce((sum, p) => sum + p.monto, 0) - total) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatVES(payments.reduce((sum, p) => sum + p.monto, 0) - total)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 4: Summary */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Resumen de Factura</h3>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Emisor */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Emisor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <p className="font-medium">Axiona, C.A.</p>
                          <p className="text-sm text-muted-foreground font-mono">J-12345678-9</p>
                          <p className="text-sm text-muted-foreground">Caracas, Venezuela</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Receptor */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Receptor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <p className="font-medium">{selectedCustomer?.razonSocial}</p>
                          <p className="text-sm text-muted-foreground font-mono">{selectedCustomer?.rif}</p>
                          <p className="text-sm text-muted-foreground">{selectedCustomer?.domicilio}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Items Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Detalle de Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Cant.</TableHead>
                            <TableHead>Precio Unit.</TableHead>
                            <TableHead>Base Imp.</TableHead>
                            <TableHead>IVA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceLines.map((line) => (
                            <TableRow key={line.itemId}>
                              <TableCell>{line.descripcion}</TableCell>
                              <TableCell>{line.cantidad}</TableCell>
                              <TableCell className="font-mono">{formatVES(line.precioUnitario)}</TableCell>
                              <TableCell className="font-mono">{formatVES(line.baseImponible)}</TableCell>
                              <TableCell className="font-mono">{formatVES(line.montoIva)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Totals */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatVES(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA (16%):</span>
                          <span className="font-mono">{formatVES(totalIva)}</span>
                        </div>
                        {totalIgtf > 0 && (
                          <div className="flex justify-between">
                            <span>IGTF (3%):</span>
                            <span className="font-mono">{formatVES(totalIgtf)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total VES:</span>
                          <span className="font-mono">{formatVES(total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Equivalencia USD (Ref.):</span>
                          <span className="font-mono">{formatUSD(totalUsdReferencia)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tasa BCV: {bcvRate?.rate} VES/USD - {bcvRate?.date}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleSubmitInvoice}
                      disabled={createInvoiceMutation.isPending}
                      className="flex-1"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Emitir Factura
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Vista Previa PDF
                    </Button>
                    <Button variant="outline">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Generar Enlace
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Navigation */}
            <div className="flex justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentStep === 4 || !canProceedToStep(currentStep + 1)}
              >
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}