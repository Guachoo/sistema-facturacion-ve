import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Venezuelan RIF validation
export const rifValidation = {
  // RIF types in Venezuela
  types: {
    'J': 'Persona Jurídica',
    'G': 'Gobierno',
    'V': 'Venezolano',
    'E': 'Extranjero',
    'P': 'Pasaporte'
  } as const,

  // Validate RIF format: J-12345678-9
  isValidFormat: (rif: string): boolean => {
    const rifPattern = /^[JGVEP]-\d{8}-\d$/;
    return rifPattern.test(rif);
  },

  // Calculate RIF verification digit
  calculateCheckDigit: (rif: string): number => {
    const cleanRif = rif.replace(/[-]/g, '');
    const type = cleanRif[0];
    const numbers = cleanRif.substring(1, 9);

    const typeValue = { J: 1, G: 2, V: 3, E: 4, P: 5 }[type] || 0;
    const weights = [4, 3, 2, 7, 6, 5, 4, 3, 2];

    let sum = typeValue * weights[0];
    for (let i = 0; i < numbers.length; i++) {
      sum += parseInt(numbers[i]) * weights[i + 1];
    }

    const remainder = sum % 11;
    return remainder < 2 ? remainder : 11 - remainder;
  },

  // Validate complete RIF with check digit
  isValid: (rif: string): boolean => {
    if (!rifValidation.isValidFormat(rif)) return false;

    const cleanRif = rif.replace(/[-]/g, '');
    const checkDigit = parseInt(cleanRif[cleanRif.length - 1]);
    const calculatedDigit = rifValidation.calculateCheckDigit(rif.substring(0, rif.lastIndexOf('-')));

    return checkDigit === calculatedDigit;
  },

  // Format RIF string
  format: (rif: string): string => {
    const clean = rif.replace(/[^JGVEP0-9]/g, '').toUpperCase();
    if (clean.length >= 9) {
      return `${clean[0]}-${clean.substring(1, 9)}-${clean[9] || ''}`;
    }
    return clean;
  },

  // Parse RIF into components
  parse: (rif: string): { type: string; number: string; checkDigit: string } | null => {
    if (!rifValidation.isValidFormat(rif)) return null;

    const parts = rif.split('-');
    return {
      type: parts[0],
      number: parts[1],
      checkDigit: parts[2]
    };
  }
};

// Document numbering utilities
export const documentNumbering = {
  // Format document number with leading zeros
  formatNumber: (number: number, series: string, length: number = 8): string => {
    return `${series}-${number.toString().padStart(length, '0')}`;
  },

  // Parse document number
  parseNumber: (documentNumber: string): { series: string; number: number } | null => {
    const match = documentNumber.match(/^([A-Z]+)-(\d+)$/);
    if (!match) return null;

    return {
      series: match[1],
      number: parseInt(match[2])
    };
  },

  // Validate series format
  isValidSeries: (series: string): boolean => {
    return /^[A-Z]{1,3}$/.test(series);
  },

  // Generate control number (for SENIAT)
  generateControlNumber: (series: string, number: number, year: number): string => {
    const base = `${series}${year.toString().slice(-2)}${number.toString().padStart(6, '0')}`;
    return base;
  }
};

// Currency and amount utilities
export const currencyUtils = {
  // Format Venezuelan currency
  formatVES: (amount: number): string => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount);
  },

  // Format USD currency
  formatUSD: (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  },

  // Calculate IVA (Venezuelan VAT)
  calculateIVA: (amount: number, rate: number = 16): number => {
    return (amount * rate) / 100;
  },

  // Calculate IGTF (Venezuelan tax on foreign currency)
  calculateIGTF: (amount: number, rate: number = 3): number => {
    return (amount * rate) / 100;
  },

  // Convert between VES and USD
  convertCurrency: (amount: number, rate: number, fromCurrency: 'VES' | 'USD', toCurrency: 'VES' | 'USD'): number => {
    if (fromCurrency === toCurrency) return amount;

    if (fromCurrency === 'USD' && toCurrency === 'VES') {
      return amount * rate;
    } else if (fromCurrency === 'VES' && toCurrency === 'USD') {
      return amount / rate;
    }

    return amount;
  }
};

// Date utilities for Venezuelan fiscal calendar
export const fiscalDateUtils = {
  // Get fiscal period (YYYY-MM format)
  getFiscalPeriod: (date: Date = new Date()): string => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  },

  // Get fiscal year
  getFiscalYear: (date: Date = new Date()): number => {
    return date.getFullYear();
  },

  // Format date for SENIAT (DD/MM/YYYY)
  formatForSENIAT: (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // Parse SENIAT date format
  parseFromSENIAT: (dateString: string): Date | null => {
    const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  },

  // Check if date is within fiscal period
  isInFiscalPeriod: (date: Date, period: string): boolean => {
    const datePeriod = fiscalDateUtils.getFiscalPeriod(date);
    return datePeriod === period;
  }
};

// Validation utilities
export const validationUtils = {
  // Validate email
  isValidEmail: (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  },

  // Validate phone number (Venezuelan format)
  isValidPhone: (phone: string): boolean => {
    const phonePattern = /^(\+58)?[-\s]?[04]\d{2}[-\s]?\d{3}[-\s]?\d{4}$/;
    return phonePattern.test(phone);
  },

  // Validate required fields
  hasRequiredFields: (obj: Record<string, any>, requiredFields: string[]): { isValid: boolean; missingFields: string[] } => {
    const missingFields = requiredFields.filter(field =>
      obj[field] === undefined || obj[field] === null || obj[field] === ''
    );

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  },

  // Sanitize input for database
  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>'"]/g, '');
  }
};

// QR Code utilities for fiscal documents
export const fiscalQRUtils = {
  /**
   * Generate QR code data for SENIAT fiscal documents
   */
  generateQRData: (params: {
    rif: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaEmision: string;
    monto: number;
    numeroControl?: string;
  }): string => {
    const {
      rif,
      tipoDocumento,
      numeroDocumento,
      fechaEmision,
      monto,
      numeroControl
    } = params;

    // SENIAT QR format: RIF|TIPO|NUMERO|FECHA|MONTO|CONTROL
    const qrData = [
      rif.replace(/[-\s]/g, ''), // Clean RIF
      tipoDocumento, // 01=Factura, 02=NotaCredito, 03=NotaDebito
      numeroDocumento.padStart(8, '0'), // 8-digit document number
      fechaEmision.replace(/\//g, ''), // DDMMYYYY format
      monto.toFixed(2), // Amount with 2 decimals
      numeroControl || '' // Control number if available
    ].join('|');

    return qrData;
  },

  /**
   * Generate QR code URL using external service
   */
  generateQRUrl: (params: {
    rif: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaEmision: string;
    monto: number;
    numeroControl?: string;
    size?: number;
  }): string => {
    const qrData = fiscalQRUtils.generateQRData(params);
    const size = params.size || 200;

    // Use QR code generation service
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrData)}`;
  },

  /**
   * Validate QR data format
   */
  validateQRData: (qrData: string): boolean => {
    const parts = qrData.split('|');
    return parts.length >= 5 && parts.length <= 6;
  },

  /**
   * Parse QR data back to components
   */
  parseQRData: (qrData: string): {
    rif: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaEmision: string;
    monto: number;
    numeroControl?: string;
  } | null => {
    const parts = qrData.split('|');
    if (parts.length < 5) return null;

    return {
      rif: parts[0],
      tipoDocumento: parts[1],
      numeroDocumento: parts[2],
      fechaEmision: parts[3],
      monto: parseFloat(parts[4]),
      numeroControl: parts[5] || undefined
    };
  }
};
