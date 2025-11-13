/**
 * Sistema de validación de numeración única para facturas
 * Garantiza que los números de facturas no se repitan como en un sistema real
 */

export interface InvoiceNumberValidation {
  isValid: boolean;
  error?: string;
  suggestedNumber?: string;
}

export interface InvoiceControlValidation {
  isValid: boolean;
  error?: string;
  suggestedControl?: string;
}

/**
 * Valida que un número de factura sea único en el sistema
 */
export async function validateUniqueInvoiceNumber(
  numero: string,
  existingInvoices: Array<{ numero: string; id?: string }>,
  excludeId?: string
): Promise<InvoiceNumberValidation> {

  if (!numero || numero.trim() === '') {
    return {
      isValid: false,
      error: 'El número de factura es obligatorio'
    };
  }

  // Verificar formato básico FAC-NNNNNN
  const formatPattern = /^FAC-\d{6}$/;
  if (!formatPattern.test(numero)) {
    return {
      isValid: false,
      error: 'El formato debe ser FAC-NNNNNN (ej: FAC-000028)'
    };
  }

  // Verificar que no existe en la base de datos
  const duplicateInvoice = existingInvoices.find(inv =>
    inv.numero === numero && inv.id !== excludeId
  );

  if (duplicateInvoice) {
    // Generar sugerencia de número único
    const existingNumbers = existingInvoices
      .map(inv => parseInt(inv.numero.split('-')[1]))
      .filter(num => !isNaN(num));

    const maxNumber = Math.max(0, ...existingNumbers);
    const suggestedNumber = `FAC-${String(maxNumber + 1).padStart(6, '0')}`;

    return {
      isValid: false,
      error: `El número ${numero} ya existe en el sistema`,
      suggestedNumber
    };
  }

  return {
    isValid: true
  };
}

/**
 * Valida que un número de control sea único
 */
export async function validateUniqueControlNumber(
  numeroControl: string,
  existingInvoices: Array<{ numeroControl: string; id?: string }>,
  excludeId?: string
): Promise<InvoiceControlValidation> {

  if (!numeroControl || numeroControl.trim() === '') {
    return {
      isValid: false,
      error: 'El número de control es obligatorio'
    };
  }

  // Verificar formato básico DIG-YYYYNNNNNN
  const formatPattern = /^DIG-\d{10}$/;
  if (!formatPattern.test(numeroControl)) {
    return {
      isValid: false,
      error: 'El formato debe ser DIG-YYYYNNNNNN (ej: DIG-2024000028)'
    };
  }

  // Verificar que no existe en la base de datos
  const duplicateControl = existingInvoices.find(inv =>
    inv.numeroControl === numeroControl && inv.id !== excludeId
  );

  if (duplicateControl) {
    // Generar sugerencia de número de control único
    const year = new Date().getFullYear();
    const existingControlNumbers = existingInvoices
      .map(inv => {
        const match = inv.numeroControl.match(/^DIG-(\d{4})(\d{6})$/);
        return match ? parseInt(match[2]) : 0;
      })
      .filter(num => !isNaN(num) && num > 0);

    const maxControlNumber = Math.max(0, ...existingControlNumbers);
    const suggestedControl = `DIG-${year}${String(maxControlNumber + 1).padStart(6, '0')}`;

    return {
      isValid: false,
      error: `El número de control ${numeroControl} ya existe en el sistema`,
      suggestedControl
    };
  }

  return {
    isValid: true
  };
}

/**
 * Genera el próximo número de factura disponible
 */
export function generateNextInvoiceNumber(
  existingInvoices: Array<{ numero: string }>
): string {
  const existingNumbers = existingInvoices
    .map(inv => {
      const match = inv.numero.match(/^FAC-(\d{6})$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => !isNaN(num) && num > 0);

  const maxNumber = Math.max(0, ...existingNumbers);
  const nextNumber = maxNumber + 1;

  return `FAC-${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Genera el próximo número de control disponible
 */
export function generateNextControlNumber(
  existingInvoices: Array<{ numeroControl: string }>
): string {
  const year = new Date().getFullYear();

  const existingControlNumbers = existingInvoices
    .map(inv => {
      const match = inv.numeroControl.match(/^DIG-(\d{4})(\d{6})$/);
      if (match && parseInt(match[1]) === year) {
        return parseInt(match[2]);
      }
      return 0;
    })
    .filter(num => !isNaN(num) && num > 0);

  const maxControlNumber = Math.max(0, ...existingControlNumbers);
  const nextControlNumber = maxControlNumber + 1;

  return `DIG-${year}${String(nextControlNumber).padStart(6, '0')}`;
}

/**
 * Valida la numeración consecutiva (opcional pero recomendado)
 */
export function validateConsecutiveNumbering(
  newNumber: string,
  existingInvoices: Array<{ numero: string; fecha: string }>
): { isConsecutive: boolean; warning?: string } {

  const newNumberInt = parseInt(newNumber.split('-')[1]);
  if (isNaN(newNumberInt)) {
    return { isConsecutive: false, warning: 'Número de factura inválido' };
  }

  // Obtener facturas ordenadas por fecha
  const sortedInvoices = existingInvoices
    .map(inv => ({
      numero: parseInt(inv.numero.split('-')[1]) || 0,
      fecha: inv.fecha
    }))
    .filter(inv => inv.numero > 0)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  if (sortedInvoices.length === 0) {
    return { isConsecutive: true };
  }

  const lastInvoice = sortedInvoices[sortedInvoices.length - 1];
  const expectedNumber = lastInvoice.numero + 1;

  if (newNumberInt !== expectedNumber) {
    return {
      isConsecutive: false,
      warning: `Se esperaba el número FAC-${String(expectedNumber).padStart(6, '0')} para mantener la secuencia consecutiva`
    };
  }

  return { isConsecutive: true };
}

/**
 * Valida una factura completa antes de guardar
 */
export async function validateInvoiceBeforeSave(
  invoice: {
    numero: string;
    numeroControl: string;
    fecha: string;
    id?: string;
  },
  existingInvoices: Array<{
    numero: string;
    numeroControl: string;
    fecha: string;
    id?: string;
  }>
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar número de factura único
  const numberValidation = await validateUniqueInvoiceNumber(
    invoice.numero,
    existingInvoices,
    invoice.id
  );

  if (!numberValidation.isValid) {
    errors.push(numberValidation.error || 'Error en número de factura');
  }

  // Validar número de control único
  const controlValidation = await validateUniqueControlNumber(
    invoice.numeroControl,
    existingInvoices,
    invoice.id
  );

  if (!controlValidation.isValid) {
    errors.push(controlValidation.error || 'Error en número de control');
  }

  // Validar numeración consecutiva (warning, no error)
  const consecutiveValidation = validateConsecutiveNumbering(
    invoice.numero,
    existingInvoices
  );

  if (!consecutiveValidation.isConsecutive && consecutiveValidation.warning) {
    warnings.push(consecutiveValidation.warning);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}