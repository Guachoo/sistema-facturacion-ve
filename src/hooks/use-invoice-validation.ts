/**
 * Hook para validar facturas en tiempo real desde React components
 */
import { useState, useEffect } from 'react';
import { useInvoices } from '@/api/invoices';
import type { Invoice } from '@/types';
import {
  validateUniqueInvoiceNumber,
  validateUniqueControlNumber,
  validateInvoiceBeforeSave,
  generateNextInvoiceNumber,
  generateNextControlNumber,
  type InvoiceNumberValidation,
  type InvoiceControlValidation
} from '@/lib/invoice-validation';

export interface UseInvoiceValidationProps {
  numero?: string;
  numeroControl?: string;
  fecha?: string;
  excludeId?: string;
}

export interface UseInvoiceValidationReturn {
  // Validaciones individuales
  numberValidation: InvoiceNumberValidation & { isLoading: boolean };
  controlValidation: InvoiceControlValidation & { isLoading: boolean };

  // Validación completa
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isValidating: boolean;

  // Funciones de ayuda
  generateNextNumber: () => string;
  generateNextControl: () => string;
  validateAll: () => Promise<void>;
}

export function useInvoiceValidation({
  numero,
  numeroControl,
  fecha,
  excludeId
}: UseInvoiceValidationProps = {}): UseInvoiceValidationReturn {

  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices() as { data: Invoice[], isLoading: boolean };

  const [numberValidation, setNumberValidation] = useState<InvoiceNumberValidation & { isLoading: boolean }>({
    isValid: true,
    isLoading: false
  });

  const [controlValidation, setControlValidation] = useState<InvoiceControlValidation & { isLoading: boolean }>({
    isValid: true,
    isLoading: false
  });

  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Validar número de factura
  useEffect(() => {
    if (!numero || invoicesLoading) return;

    setNumberValidation(prev => ({ ...prev, isLoading: true }));

    validateUniqueInvoiceNumber(numero, invoices, excludeId)
      .then(result => {
        setNumberValidation({ ...result, isLoading: false });
      })
      .catch(() => {
        setNumberValidation({
          isValid: false,
          error: 'Error al validar el número de factura',
          isLoading: false
        });
      });
  }, [numero, invoices, excludeId, invoicesLoading]);

  // Validar número de control
  useEffect(() => {
    if (!numeroControl || invoicesLoading) return;

    setControlValidation(prev => ({ ...prev, isLoading: true }));

    validateUniqueControlNumber(numeroControl, invoices, excludeId)
      .then(result => {
        setControlValidation({ ...result, isLoading: false });
      })
      .catch(() => {
        setControlValidation({
          isValid: false,
          error: 'Error al validar el número de control',
          isLoading: false
        });
      });
  }, [numeroControl, invoices, excludeId, invoicesLoading]);

  // Validación completa
  const validateAll = async () => {
    if (!numero || !numeroControl || invoicesLoading) return;

    setIsValidating(true);
    setErrors([]);
    setWarnings([]);

    try {
      const validation = await validateInvoiceBeforeSave(
        {
          numero,
          numeroControl,
          fecha: fecha || new Date().toISOString().split('T')[0]
        },
        invoices
      );

      setErrors(validation.errors);
      setWarnings(validation.warnings);
    } catch (error) {
      setErrors(['Error al validar la factura']);
    } finally {
      setIsValidating(false);
    }
  };

  // Ejecutar validación completa cuando cambian los valores
  useEffect(() => {
    if (numero && numeroControl) {
      validateAll();
    }
  }, [numero, numeroControl, fecha, invoices, excludeId]);

  // Funciones de ayuda
  const generateNextNumber = () => {
    return generateNextInvoiceNumber(invoices);
  };

  const generateNextControl = () => {
    return generateNextControlNumber(invoices);
  };

  const isValid = numberValidation.isValid &&
                  controlValidation.isValid &&
                  errors.length === 0 &&
                  !numberValidation.isLoading &&
                  !controlValidation.isLoading &&
                  !isValidating;

  return {
    numberValidation,
    controlValidation,
    isValid,
    errors,
    warnings,
    isValidating: isValidating || numberValidation.isLoading || controlValidation.isLoading,
    generateNextNumber,
    generateNextControl,
    validateAll
  };
}

/**
 * Hook simplificado para mostrar solo el estado de validación
 */
export function useInvoiceValidationStatus(
  numero?: string,
  numeroControl?: string,
  excludeId?: string
) {
  const validation = useInvoiceValidation({
    numero,
    numeroControl,
    excludeId
  });

  return {
    isValid: validation.isValid,
    isValidating: validation.isValidating,
    hasErrors: validation.errors.length > 0,
    hasWarnings: validation.warnings.length > 0,
    errorMessage: validation.errors.join(', '),
    warningMessage: validation.warnings.join(', ')
  };
}