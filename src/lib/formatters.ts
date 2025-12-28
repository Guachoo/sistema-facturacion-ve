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

// Función auxiliar para calcular el dígito verificador de RIF/Cédula venezolana
const calculateRifDigit = (type: string, numbers: string): number => {
  const typeValue = { J: 1, G: 2, V: 3, E: 4, P: 5 }[type.toUpperCase()] || 3; // Default V
  const weights = [4, 3, 2, 7, 6, 5, 4, 3, 2];

  let sum = typeValue * weights[0];
  for (let i = 0; i < numbers.length && i < 8; i++) {
    sum += parseInt(numbers[i]) * weights[i + 1];
  }

  const remainder = sum % 11;
  return remainder < 2 ? remainder : 11 - remainder;
};
export const formatRIF = (rif: string): string => {
  // Remove any non-alphanumeric characters
  const cleaned = rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Si empieza con solo números, asumir que es cédula (V-) y calcular dígito automáticamente
  if (/^\d/.test(cleaned) && cleaned.length > 0) {
    if (cleaned.length >= 8) {
      const numbers = cleaned.slice(0, 8);
      const checkDigit = calculateRifDigit('V', numbers);
      return `V-${numbers}-${checkDigit}`;
    }
    return cleaned;
  }

  // Apply RIF format: X-XXXXXXXX-X con cálculo automático del dígito
  if (cleaned.length >= 9) {
    const type = cleaned[0];
    const numbers = cleaned.slice(1, 9);

    // Si ya tiene 10 caracteres (incluye dígito), usar el proporcionado
    if (cleaned.length >= 10) {
      return `${type}-${numbers}-${cleaned[9]}`;
    }

    // Si solo tiene 9 caracteres (tipo + 8 números), calcular el dígito automáticamente
    const checkDigit = calculateRifDigit(type, numbers);
    return `${type}-${numbers}-${checkDigit}`;
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