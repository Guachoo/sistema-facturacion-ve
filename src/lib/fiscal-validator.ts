/**
 * SENIAT Fiscal Document Validator
 * Validates generated JSON documents against SENIAT requirements
 */

import type { VenezuelanFiscalDocument, AnulacionDocument } from '@/types/fiscal-documents';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  compliance: {
    structure: boolean;
    requiredFields: boolean;
    formats: boolean;
    calculations: boolean;
  };
}

export class FiscalDocumentValidator {

  /**
   * Validate a complete fiscal document
   */
  validateDocument(document: VenezuelanFiscalDocument): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      compliance: {
        structure: false,
        requiredFields: false,
        formats: false,
        calculations: false
      }
    };

    // Validate document structure
    result.compliance.structure = this.validateStructure(document, result);

    // Validate required fields
    result.compliance.requiredFields = this.validateRequiredFields(document, result);

    // Validate field formats
    result.compliance.formats = this.validateFormats(document, result);

    // Validate calculations
    result.compliance.calculations = this.validateCalculations(document, result);

    // Document is valid if all compliance checks pass
    result.isValid = Object.values(result.compliance).every(check => check);

    return result;
  }

  /**
   * Validate document structure
   */
  private validateStructure(document: VenezuelanFiscalDocument, result: ValidationResult): boolean {
    if (!document.documentoElectronico) {
      result.errors.push('Missing documentoElectronico root element');
      return false;
    }

    const encabezado = document.documentoElectronico.Encabezado;
    if (!encabezado) {
      result.errors.push('Missing Encabezado section');
      return false;
    }

    // Check required sections
    const requiredSections = [
      'IdentificacionDocumento',
      'Vendedor',
      'Comprador',
      'Totales'
    ];

    for (const section of requiredSections) {
      if (!encabezado[section as keyof typeof encabezado]) {
        result.errors.push(`Missing required section: ${section}`);
        return false;
      }
    }

    if (!document.documentoElectronico.DetallesItems || document.documentoElectronico.DetallesItems.length === 0) {
      result.errors.push('Missing or empty DetallesItems');
      return false;
    }

    return true;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(document: VenezuelanFiscalDocument, result: ValidationResult): boolean {
    const encabezado = document.documentoElectronico.Encabezado!;
    let isValid = true;

    // IdentificacionDocumento required fields
    const identificacion = encabezado.IdentificacionDocumento;
    const requiredIdFields = [
      'TipoDocumento',
      'NumeroDocumento',
      'FechaEmision',
      'HoraEmision',
      'Serie',
      'Sucursal',
      'Moneda'
    ];

    for (const field of requiredIdFields) {
      if (!identificacion?.[field as keyof typeof identificacion]) {
        result.errors.push(`Missing required field: IdentificacionDocumento.${field}`);
        isValid = false;
      }
    }

    // Vendedor required fields
    const vendedor = encabezado.Vendedor;
    if (!vendedor?.Codigo || !vendedor?.Nombre) {
      result.errors.push('Missing required Vendedor fields (Codigo, Nombre)');
      isValid = false;
    }

    // Comprador required fields
    const comprador = encabezado.Comprador;
    const requiredCompradorFields = [
      'TipoIdentificacion',
      'NumeroIdentificacion',
      'RazonSocial',
      'Direccion'
    ];

    for (const field of requiredCompradorFields) {
      if (!comprador?.[field as keyof typeof comprador]) {
        result.errors.push(`Missing required field: Comprador.${field}`);
        isValid = false;
      }
    }

    // Totales required fields
    const totales = encabezado.Totales;
    const requiredTotalesFields = [
      'NroItems',
      'Subtotal',
      'TotalAPagar',
      'MontoEnLetras'
    ];

    for (const field of requiredTotalesFields) {
      if (!totales?.[field as keyof typeof totales]) {
        result.errors.push(`Missing required field: Totales.${field}`);
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Validate field formats
   */
  private validateFormats(document: VenezuelanFiscalDocument, result: ValidationResult): boolean {
    const encabezado = document.documentoElectronico.Encabezado!;
    let isValid = true;

    // Validate date format (DD/MM/YYYY)
    const fechaEmision = encabezado.IdentificacionDocumento?.FechaEmision;
    if (fechaEmision && !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaEmision)) {
      result.errors.push('Invalid FechaEmision format. Expected DD/MM/YYYY');
      isValid = false;
    }

    // Validate time format (HH:MM:SS am/pm)
    const horaEmision = encabezado.IdentificacionDocumento?.HoraEmision;
    if (horaEmision && !/^\d{2}:\d{2}:\d{2} (am|pm)$/.test(horaEmision)) {
      result.errors.push('Invalid HoraEmision format. Expected HH:MM:SS am/pm');
      isValid = false;
    }

    // Validate document type
    const tipoDocumento = encabezado.IdentificacionDocumento?.TipoDocumento;
    if (tipoDocumento && !['01', '02', '03'].includes(tipoDocumento)) {
      result.errors.push('Invalid TipoDocumento. Must be 01 (Factura), 02 (Nota Crédito), or 03 (Nota Débito)');
      isValid = false;
    }

    // Additional validations for credit/debit notes
    if (tipoDocumento && ['02', '03'].includes(tipoDocumento)) {
      const requiredFieldsForNotes = [
        'SerieFacturaAfectada',
        'NumeroFacturaAfectada',
        'FechaFacturaAfectada',
        'MontoFacturaAfectada',
        'ComentarioFacturaAfectada'
      ];

      for (const field of requiredFieldsForNotes) {
        if (!encabezado.IdentificacionDocumento?.[field as keyof typeof encabezado.IdentificacionDocumento]) {
          result.errors.push(`Missing required field for credit/debit note: IdentificacionDocumento.${field}`);
          isValid = false;
        }
      }
    }

    // Validate RIF format
    const numeroIdentificacion = encabezado.Comprador?.NumeroIdentificacion;
    if (numeroIdentificacion && !/^\d{8,9}-?\d$/.test(numeroIdentificacion)) {
      result.warnings.push('NumeroIdentificacion format may not be standard RIF format');
    }

    // Validate currency
    const moneda = encabezado.IdentificacionDocumento?.Moneda;
    if (moneda && !['VES', 'USD', 'EUR'].includes(moneda)) {
      result.warnings.push('Unusual currency code. Standard codes are VES, USD, EUR');
    }

    return isValid;
  }

  /**
   * Validate calculations
   */
  private validateCalculations(document: VenezuelanFiscalDocument, result: ValidationResult): boolean {
    const encabezado = document.documentoElectronico.Encabezado!;
    const totales = encabezado.Totales;
    const items = document.documentoElectronico.DetallesItems!;
    let isValid = true;

    // Calculate expected totals from items
    let expectedSubtotal = 0;
    let expectedIVA = 0;
    let expectedItems = 0;

    for (const item of items) {
      const precio = parseFloat(item.PrecioItem || '0');
      const iva = parseFloat(item.ValorIVA || '0');

      expectedSubtotal += precio;
      expectedIVA += iva;
      expectedItems++;
    }

    // Validate item count
    const nroItems = parseInt(totales?.NroItems || '0');
    if (nroItems !== expectedItems) {
      result.errors.push(`Item count mismatch. Declared: ${nroItems}, Calculated: ${expectedItems}`);
      isValid = false;
    }

    // Validate subtotal (with tolerance for rounding)
    const subtotal = parseFloat(totales?.Subtotal || '0');
    if (Math.abs(subtotal - expectedSubtotal) > 0.02) {
      result.errors.push(`Subtotal calculation error. Declared: ${subtotal}, Calculated: ${expectedSubtotal.toFixed(2)}`);
      isValid = false;
    }

    // Validate IVA total
    const totalIVA = parseFloat(totales?.TotalIVA || '0');
    if (Math.abs(totalIVA - expectedIVA) > 0.02) {
      result.errors.push(`IVA total calculation error. Declared: ${totalIVA}, Calculated: ${expectedIVA.toFixed(2)}`);
      isValid = false;
    }

    // Validate total amount
    const totalAPagar = parseFloat(totales?.TotalAPagar || '0');
    const expectedTotal = expectedSubtotal + expectedIVA;
    if (Math.abs(totalAPagar - expectedTotal) > 0.02) {
      result.errors.push(`Total amount calculation error. Declared: ${totalAPagar}, Calculated: ${expectedTotal.toFixed(2)}`);
      isValid = false;
    }

    return isValid;
  }

  /**
   * Quick validation for basic structure
   */
  isValidBasicStructure(document: VenezuelanFiscalDocument): boolean {
    try {
      return !!(
        document.documentoElectronico &&
        document.documentoElectronico.Encabezado &&
        document.documentoElectronico.Encabezado.IdentificacionDocumento &&
        document.documentoElectronico.Encabezado.Comprador &&
        document.documentoElectronico.Encabezado.Totales &&
        document.documentoElectronico.DetallesItems &&
        document.documentoElectronico.DetallesItems.length > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(document: VenezuelanFiscalDocument): string {
    const validation = this.validateDocument(document);

    let report = '=== REPORTE DE CUMPLIMIENTO SENIAT ===\n\n';

    report += `Estado General: ${validation.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n\n`;

    report += 'Cumplimiento por Categoría:\n';
    report += `• Estructura: ${validation.compliance.structure ? '✅' : '❌'}\n`;
    report += `• Campos Requeridos: ${validation.compliance.requiredFields ? '✅' : '❌'}\n`;
    report += `• Formatos: ${validation.compliance.formats ? '✅' : '❌'}\n`;
    report += `• Cálculos: ${validation.compliance.calculations ? '✅' : '❌'}\n\n`;

    if (validation.errors.length > 0) {
      report += 'ERRORES:\n';
      validation.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += 'ADVERTENCIAS:\n';
      validation.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (validation.isValid) {
      report += '✅ El documento cumple con los requisitos SENIAT y está listo para transmisión.';
    } else {
      report += '❌ El documento NO cumple con los requisitos SENIAT. Corrija los errores antes de transmitir.';
    }

    return report;
  }
}

// Export singleton validator instance
export const fiscalValidator = new FiscalDocumentValidator();

// Export validation utilities
export const validateFiscalDocument = (document: VenezuelanFiscalDocument): ValidationResult => {
  return fiscalValidator.validateDocument(document);
};

export const generateComplianceReport = (document: VenezuelanFiscalDocument): string => {
  return fiscalValidator.generateComplianceReport(document);
};

/**
 * Validate cancellation (anulación) document
 */
export const validateAnulacionDocument = (document: AnulacionDocument): ValidationResult => {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    compliance: {
      structure: false,
      requiredFields: false,
      formats: false,
      calculations: true // No calculations needed for cancellation documents
    }
  };

  // Check required fields
  const requiredFields = ['serie', 'tipoDocumento', 'numeroDocumento', 'motivoAnulacion', 'fechaAnulacion', 'horaAnulacion'];
  const missingFields = requiredFields.filter(field => !document[field as keyof AnulacionDocument]);

  if (missingFields.length > 0) {
    result.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  } else {
    result.compliance.requiredFields = true;
  }

  // Validate formats
  let formatsValid = true;

  // Validate date format (DD/MM/YYYY)
  if (document.fechaAnulacion && !/^\d{2}\/\d{2}\/\d{4}$/.test(document.fechaAnulacion)) {
    result.errors.push('Invalid fechaAnulacion format. Expected DD/MM/YYYY');
    formatsValid = false;
  }

  // Validate time format (HH:MM:SS am/pm)
  if (document.horaAnulacion && !/^\d{2}:\d{2}:\d{2} (am|pm)$/.test(document.horaAnulacion)) {
    result.errors.push('Invalid horaAnulacion format. Expected HH:MM:SS am/pm');
    formatsValid = false;
  }

  // Validate document type
  if (document.tipoDocumento && !['01', '02', '03'].includes(document.tipoDocumento)) {
    result.errors.push('Invalid tipoDocumento. Must be 01 (Factura), 02 (Nota Crédito), or 03 (Nota Débito)');
    formatsValid = false;
  }

  // Validate serie format
  if (document.serie && !/^[A-Z]$/.test(document.serie)) {
    result.errors.push('Invalid serie format. Must be a single uppercase letter');
    formatsValid = false;
  }

  result.compliance.formats = formatsValid;
  result.compliance.structure = true; // Simple structure, always valid if has required fields

  // Document is valid if all compliance checks pass
  result.isValid = Object.values(result.compliance).every(check => check);

  return result;
};