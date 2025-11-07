/**
 * Transaction ID Generator - Option 1: Structured ID
 * Generates human-readable, structured transaction IDs
 * Format: TXN_YYYYMMDDSS_[SERIE][NUMERO]
 */

export interface TransactionIdOptions {
  serie: string;
  numeroDocumento: string;
  tipoDocumento?: string;
  sucursal?: string;
}

export interface ParsedTransactionId {
  prefix: string;
  fecha: string;
  secuencia: string;
  serie: string;
  numeroDocumento: string;
  year: number;
  month: number;
  day: number;
  isValid: boolean;
}

/**
 * Daily sequence counter for transaction IDs
 */
class SequenceCounter {
  private static instance: SequenceCounter;
  private dailyCounters = new Map<string, number>();

  static getInstance(): SequenceCounter {
    if (!SequenceCounter.instance) {
      SequenceCounter.instance = new SequenceCounter();
    }
    return SequenceCounter.instance;
  }

  getNextSequence(date: string): string {
    const current = this.dailyCounters.get(date) || 0;
    const next = current + 1;
    this.dailyCounters.set(date, next);
    return String(next).padStart(2, '0');
  }

  resetDaily() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    // Keep only today's counter, clear old ones
    for (const [date] of this.dailyCounters.entries()) {
      if (date !== today) {
        this.dailyCounters.delete(date);
      }
    }
  }
}

/**
 * Generate structured transaction ID
 * @param options - Transaction details
 * @returns Structured transaction ID
 */
export function generateTransactionId(options: TransactionIdOptions): string {
  const { serie, numeroDocumento, tipoDocumento = '01' } = options;

  // Validate inputs
  if (!serie || !numeroDocumento) {
    throw new Error('Serie and numeroDocumento are required');
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateKey = `${year}${month}${day}`;

  // Get next sequence for today
  const counter = SequenceCounter.getInstance();
  const sequence = counter.getNextSequence(dateKey);

  // Clean and format serie and numero
  const cleanSerie = serie.toUpperCase().trim();
  const cleanNumero = numeroDocumento.padStart(8, '0');

  // Build structured ID
  const transactionId = `TXN_${dateKey}${sequence}_${cleanSerie}${cleanNumero}`;

  return transactionId;
}

/**
 * Generate transaction ID for specific document type
 * @param options - Transaction details with document type
 * @returns Type-specific transaction ID
 */
export function generateDocumentTransactionId(options: TransactionIdOptions): string {
  const { tipoDocumento = '01' } = options;

  // Document type prefixes
  const prefixes: Record<string, string> = {
    '01': 'FAC', // Factura
    '02': 'NCR', // Nota Crédito
    '03': 'NDB', // Nota Débito
    '04': 'ANU', // Anulación
  };

  const prefix = prefixes[tipoDocumento] || 'TXN';
  const baseId = generateTransactionId(options);

  // Replace TXN with document-specific prefix
  return baseId.replace('TXN_', `${prefix}_`);
}

/**
 * Parse transaction ID back to components
 * @param transactionId - Transaction ID to parse
 * @returns Parsed components
 */
export function parseTransactionId(transactionId: string): ParsedTransactionId {
  const defaultResult: ParsedTransactionId = {
    prefix: '',
    fecha: '',
    secuencia: '',
    serie: '',
    numeroDocumento: '',
    year: 0,
    month: 0,
    day: 0,
    isValid: false
  };

  try {
    // Pattern: TXN_YYYYMMDDSS_SERIENUMERO
    const pattern = /^([A-Z]{3})_(\d{8})(\d{2})_([A-Z]+)(\d+)$/;
    const match = transactionId.match(pattern);

    if (!match) {
      return defaultResult;
    }

    const [, prefix, fecha, secuencia, serie, numeroDocumento] = match;

    // Parse date components
    const year = parseInt(fecha.substring(0, 4));
    const month = parseInt(fecha.substring(4, 6));
    const day = parseInt(fecha.substring(6, 8));

    // Validate date
    const testDate = new Date(year, month - 1, day);
    const isValidDate = testDate.getFullYear() === year &&
                       testDate.getMonth() === month - 1 &&
                       testDate.getDate() === day;

    return {
      prefix,
      fecha,
      secuencia,
      serie,
      numeroDocumento,
      year,
      month,
      day,
      isValid: isValidDate
    };
  } catch (error) {
    return defaultResult;
  }
}

/**
 * Validate transaction ID format
 * @param transactionId - Transaction ID to validate
 * @returns Validation result
 */
export function validateTransactionId(transactionId: string): {
  isValid: boolean;
  error?: string;
  components?: ParsedTransactionId;
} {
  if (!transactionId || typeof transactionId !== 'string') {
    return {
      isValid: false,
      error: 'Transaction ID is required and must be a string'
    };
  }

  const components = parseTransactionId(transactionId);

  if (!components.isValid) {
    return {
      isValid: false,
      error: 'Invalid transaction ID format. Expected: TXN_YYYYMMDDSS_SERIENUMERO',
      components
    };
  }

  // Additional validations
  const now = new Date();
  const idDate = new Date(components.year, components.month - 1, components.day);

  // Check if date is not in the future
  if (idDate > now) {
    return {
      isValid: false,
      error: 'Transaction ID date cannot be in the future',
      components
    };
  }

  // Check if date is not too old (optional - 1 year limit)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (idDate < oneYearAgo) {
    return {
      isValid: false,
      error: 'Transaction ID date is too old (more than 1 year)',
      components
    };
  }

  return {
    isValid: true,
    components
  };
}

/**
 * Generate next document number for a series
 * @param serie - Document series
 * @param lastNumber - Last used number
 * @returns Next document number
 */
export function generateNextDocumentNumber(serie: string, lastNumber: string = '00000000'): string {
  const currentNumber = parseInt(lastNumber) || 0;
  const nextNumber = currentNumber + 1;
  return String(nextNumber).padStart(8, '0');
}

/**
 * Create complete document reference
 * @param options - Document details
 * @returns Complete document reference object
 */
export function createDocumentReference(options: TransactionIdOptions) {
  const transactionId = generateDocumentTransactionId(options);

  return {
    serie: options.serie,
    tipoDocumento: options.tipoDocumento || '01',
    numeroDocumento: options.numeroDocumento,
    transactionId,
    timestamp: new Date().toISOString(),
    components: parseTransactionId(transactionId)
  };
}

// Auto-reset daily counters at midnight
if (typeof window !== 'undefined') {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    SequenceCounter.getInstance().resetDaily();
    // Set up daily reset
    setInterval(() => {
      SequenceCounter.getInstance().resetDaily();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilMidnight);
}