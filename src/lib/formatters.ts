import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Venezuelan number formatting
export const formatVES = (amount: number): string => {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Format numbers with Venezuelan locale (comma as decimal separator visually)
export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

// Parse Venezuelan formatted number input to JavaScript number
export const parseVenezuelanNumber = (value: string): number => {
  // Replace comma with dot for parsing, remove spaces and currency symbols
  const cleanValue = value
    .replace(/[^\d,.-]/g, '') // Remove non-numeric except comma, dot, hyphen
    .replace(',', '.'); // Replace comma with dot for parsing
  return parseFloat(cleanValue) || 0;
};

// Format date to Venezuelan format DD/MM/YYYY
export const formatDateVE = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Fecha inválida';
    }
    return format(d, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return 'Fecha inválida';
  }
};

// Format datetime for Venezuelan users
export const formatDateTimeVE = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Fecha/hora inválida';
    }
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return 'Fecha/hora inválida';
  }
};

// RIF formatting and validation
export const formatRIF = (rif: string): string => {
  // Remove any non-alphanumeric characters
  const cleaned = rif.replace(/[^A-Za-z0-9]/g, '');
  
  // Apply RIF format: X-XXXXXXXX-X
  if (cleaned.length >= 10) {
    return `${cleaned[0]}-${cleaned.slice(1, 9)}-${cleaned[9]}`;
  }
  return cleaned;
};

export const validateRIF = (rif: string): boolean => {
  const rifRegex = /^[VEJPG]-?\d{8}-?\d$/i;
  return rifRegex.test(rif.replace(/\s/g, ''));
};

// Test function to verify RIF validation works correctly
export const testRIFValidation = () => {
  const testCases = [
    'V-27853152-6', // Persona natural venezolana
    'E-12345678-9', // Extranjero
    'J-40123456-7', // Persona jurídica
    'P-87654321-2', // Pasaporte
    'G-20000169-0', // Gobierno
    'v-27853152-6', // Minúscula
    'V27853152-6',  // Sin primer guión
    'V-278531526',  // Sin último guión
    'V278531526',   // Sin guiones
  ];

  console.log('=== Pruebas de validación RIF ===');
  testCases.forEach(rif => {
    const isValid = validateRIF(rif);
    console.log(`${rif}: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
  });
};

// Calculate IGTF (3% on foreign currency payments outside national financial system)
export const calculateIGTF = (amount: number, paymentType: string): number => {
  const igtfApplicableTypes = ['usd_cash', 'zelle'];
  return igtfApplicableTypes.includes(paymentType) ? amount * 0.03 : 0;
};

// Calculate IVA (16% in Venezuela)
export const calculateIVA = (baseAmount: number): number => {
  return baseAmount * 0.16;
};