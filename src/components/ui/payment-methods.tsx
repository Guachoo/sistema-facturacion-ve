import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from './money-input';
import { Plus, Trash2 } from 'lucide-react';
import { formatVES, calculateIGTF } from '@/lib/formatters';
import type { Payment } from '@/types';

interface PaymentMethodsProps {
  payments: Payment[];
  totalAmount: number;
  onChange: (payments: Payment[]) => void;
}

export function PaymentMethods({ payments, totalAmount, onChange }: PaymentMethodsProps) {
  const addPayment = () => {
    const remainingAmount = totalAmount - payments.reduce((sum, p) => sum + p.monto, 0);
    const newPayment: Payment = {
      tipo: 'transferencia_ves',
      monto: Math.max(0, remainingAmount),
      aplicaIgtf: false,
    };
    onChange([...payments, newPayment]);
  };

  const updatePayment = (index: number, updates: Partial<Payment>) => {
    const updatedPayments = payments.map((payment, i) => {
      if (i === index) {
        const updatedPayment = { ...payment, ...updates };
        const aplicaIgtf = updatedPayment.tipo === 'usd_cash' || updatedPayment.tipo === 'zelle';
        const montoIgtf = aplicaIgtf ? calculateIGTF(updatedPayment.monto, updatedPayment.tipo) : 0;
        return { ...updatedPayment, aplicaIgtf, montoIgtf };
      }
      return payment;
    });
    onChange(updatedPayments);
  };

  const removePayment = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.monto, 0);
  const totalIgtf = payments.reduce((sum, p) => sum + (p.montoIgtf || 0), 0);
  const difference = totalPaid - totalAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Formas de Pago</h3>
        <Button onClick={addPayment} size="sm">
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

              {payment.aplicaIgtf && payment.montoIgtf && payment.montoIgtf > 0 && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">IGTF (3%)</span>
                    <span className="font-mono">{formatVES(payment.montoIgtf)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Impuesto aplicable a transacciones en divisas fuera del sistema financiero nacional
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {payments.length > 0 && (
        <Card className={`border-2 ${Math.abs(difference) < 0.01 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'}`}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total a Pagar:</span>
                <span className="font-mono font-bold">{formatVES(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pagos:</span>
                <span className="font-mono">{formatVES(totalPaid)}</span>
              </div>
              {totalIgtf > 0 && (
                <div className="flex justify-between">
                  <span>IGTF Total:</span>
                  <span className="font-mono">{formatVES(totalIgtf)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Diferencia:</span>
                <span className={`font-mono font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatVES(difference)}
                </span>
              </div>
              {Math.abs(difference) < 0.01 && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Los pagos coinciden con el total de la factura
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}