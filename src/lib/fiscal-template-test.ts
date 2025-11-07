/**
 * Test fiscal template generation with real data
 */

import { fiscalTemplateGenerator } from '@/services/fiscal-template-generator';
import { fiscalValidator, validateAnulacionDocument } from '@/lib/fiscal-validator';
import { fiscalQRUtils, fiscalDateUtils } from '@/lib/utils';
import { TipoDocumentoFiscal } from '@/types/fiscal-documents';
import type { Invoice, Customer, InvoiceLine, Item } from '@/types';

// Mock company settings for testing
const testCompanyConfig = {
  company: {
    rif: "J-12345678-9",
    razonSocial: "EMPRESA EJEMPLO C.A.",
    domicilioFiscal: "Av. Principal, Caracas, Venezuela",
    telefonos: "+58-212-000-0000",
    email: "info@empresa.com",
    condicionesVenta: "Contado"
  },
  serie: "A",
  sucursal: "0001",
  vendedor: {
    codigo: "V01",
    nombre: "Vendedor Sistema",
    numCajero: "001"
  }
};

// Test customer data
const testCustomer: Customer = {
  id: "CUST001",
  rif: "J-26159207-6",
  razonSocial: "Eduardo Montiel",
  domicilio: "Av Principal de algun sitio",
  tipoContribuyente: "ordinario",
  telefono: "+582122447664",
  email: "correoprueba@gmail.com"
};

// Test item data
const testItem: Item = {
  id: "ITEM001",
  codigo: "7591",
  descripcion: "Refresco PET 500 ml",
  tipo: "producto",
  precioBase: 5.00,
  ivaAplica: true,
  alicuotaIva: 16,
  codigoSeniat: "12345678",
  categoriaSeniat: "bien",
  unidadMedida: "unidad",
  origenFiscal: "nacional"
};

// Test invoice line
const testInvoiceLine: InvoiceLine = {
  id: "LINE001",
  itemId: "ITEM001",
  codigo: "7591",
  descripcion: "Refresco PET 500 ml",
  cantidad: 2,
  precioUnitario: 5.00,
  descuento: 0,
  alicuotaIva: 16,
  baseImponible: 10.00,
  montoIva: 1.60,
  total: 11.60,
  item: testItem
};

// Test invoice data
const testInvoice: Invoice = {
  numero: "A-00000001",
  numeroControl: "A00000101",
  fecha: new Date("2023-01-20").toISOString(),
  emisor: {
    nombre: testCompanyConfig.company.razonSocial,
    rif: testCompanyConfig.company.rif,
    domicilio: testCompanyConfig.company.domicilioFiscal
  },
  receptor: testCustomer,
  lineas: [testInvoiceLine],
  pagos: [
    {
      tipo: "transferencia_ves",
      monto: 11.60,
      aplicaIgtf: false
    }
  ],
  subtotal: 10.00,
  baseImponible: 10.00,
  montoIva: 1.60,
  montoIgtf: 0,
  total: 11.60,
  totalUsdReferencia: 0.32,
  tasaBcv: 36.50,
  fechaTasaBcv: "2023-01-20",
  canal: "digital",
  estado: "emitida"
};

/**
 * Test fiscal template generation
 */
export function testFiscalTemplateGeneration(): {
  success: boolean;
  results: {
    templateGeneration: boolean;
    validationPassed: boolean;
    qrGenerated: boolean;
    complianceReport: string;
  };
  errors: string[];
} {
  const results = {
    templateGeneration: false,
    validationPassed: false,
    qrGenerated: false,
    complianceReport: ""
  };
  const errors: string[] = [];

  try {
    console.log("🧪 Testing Fiscal Template Generation...");

    // 1. Generate fiscal document
    console.log("1. Generating fiscal document template...");
    const fiscalDocument = fiscalTemplateGenerator.generateFactura(testInvoice, testCustomer);

    if (fiscalDocument && fiscalDocument.documentoElectronico) {
      results.templateGeneration = true;
      console.log("✅ Template generation successful");

      // Log generated document structure for verification
      console.log("Generated document structure:");
      console.log("- TipoDocumento:", fiscalDocument.documentoElectronico.Encabezado?.IdentificacionDocumento?.TipoDocumento);
      console.log("- NumeroDocumento:", fiscalDocument.documentoElectronico.Encabezado?.IdentificacionDocumento?.NumeroDocumento);
      console.log("- RIF Comprador:", fiscalDocument.documentoElectronico.Encabezado?.Comprador?.NumeroIdentificacion);
      console.log("- Total:", fiscalDocument.documentoElectronico.Encabezado?.Totales?.TotalAPagar);
      console.log("- Items count:", fiscalDocument.documentoElectronico.DetallesItems?.length);
    } else {
      errors.push("Failed to generate fiscal document template");
    }

    // 2. Validate generated document
    console.log("2. Validating fiscal document compliance...");
    const validation = fiscalValidator.validateDocument(fiscalDocument);

    if (validation.isValid) {
      results.validationPassed = true;
      console.log("✅ Document validation passed");
    } else {
      errors.push(`Document validation failed: ${validation.errors.join(', ')}`);
      console.log("❌ Document validation failed:");
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Generate compliance report
    results.complianceReport = fiscalValidator.generateComplianceReport(fiscalDocument);

    // 3. Generate QR code
    console.log("3. Generating QR code...");
    try {
      const qrData = fiscalQRUtils.generateQRData({
        rif: testCustomer.rif,
        tipoDocumento: "01",
        numeroDocumento: "00000001",
        fechaEmision: fiscalDateUtils.formatForSENIAT(new Date(testInvoice.fecha)),
        monto: testInvoice.total,
        numeroControl: testInvoice.numeroControl
      });

      const qrUrl = fiscalQRUtils.generateQRUrl({
        rif: testCustomer.rif,
        tipoDocumento: "01",
        numeroDocumento: "00000001",
        fechaEmision: fiscalDateUtils.formatForSENIAT(new Date(testInvoice.fecha)),
        monto: testInvoice.total,
        numeroControl: testInvoice.numeroControl,
        size: 200
      });

      if (qrData && qrUrl) {
        results.qrGenerated = true;
        console.log("✅ QR code generation successful");
        console.log("QR Data:", qrData);
        console.log("QR URL:", qrUrl);
      }
    } catch (qrError) {
      errors.push(`QR generation failed: ${qrError}`);
    }

  } catch (error) {
    errors.push(`Test execution failed: ${error}`);
    console.error("❌ Test execution failed:", error);
  }

  const success = results.templateGeneration && results.validationPassed && results.qrGenerated;

  console.log("\n📊 Test Results Summary:");
  console.log(`- Template Generation: ${results.templateGeneration ? '✅' : '❌'}`);
  console.log(`- Validation Passed: ${results.validationPassed ? '✅' : '❌'}`);
  console.log(`- QR Generated: ${results.qrGenerated ? '✅' : '❌'}`);
  console.log(`- Overall Success: ${success ? '✅' : '❌'}`);

  if (errors.length > 0) {
    console.log("\n❌ Errors found:");
    errors.forEach(error => console.log(`   - ${error}`));
  }

  return {
    success,
    results,
    errors
  };
}

/**
 * Run comprehensive fiscal system test
 */
export function runFiscalSystemTest(): void {
  console.log("🚀 STARTING PHASE 4 - STEP 1 FISCAL SYSTEM TEST");
  console.log("=" .repeat(60));

  const testResult = testFiscalTemplateGeneration();

  console.log("\n" + "=".repeat(60));

  if (testResult.success) {
    console.log("🎉 PHASE 4 - STEP 1 COMPLETED SUCCESSFULLY!");
    console.log("✅ All fiscal template systems are working correctly");
    console.log("✅ Ready to proceed to Step 2: Documentos Complementarios");
  } else {
    console.log("❌ PHASE 4 - STEP 1 NEEDS FIXES");
    console.log("Please resolve the following issues before proceeding:");
    testResult.errors.forEach(error => console.log(`   • ${error}`));
  }

  console.log("\n📋 Compliance Report:");
  console.log(testResult.results.complianceReport);
}

/**
 * Test credit/debit notes and cancellation documents
 */
export function testComplementaryDocuments(): {
  success: boolean;
  results: {
    creditNoteGeneration: boolean;
    debitNoteGeneration: boolean;
    cancellationGeneration: boolean;
    validationsPassed: boolean;
  };
  errors: string[];
} {
  const results = {
    creditNoteGeneration: false,
    debitNoteGeneration: false,
    cancellationGeneration: false,
    validationsPassed: false
  };
  const errors: string[] = [];

  try {
    console.log("🧪 Testing Complementary Documents...");

    // Test original invoice data for reference
    const originalInvoice = {
      serie: "A",
      numero: "00000001",
      fecha: "20/01/2023",
      monto: 11.60
    };

    // 1. Test Credit Note Generation
    console.log("1. Testing Credit Note generation...");
    try {
      const creditNote = fiscalTemplateGenerator.generateNotaCredito(
        testInvoice,
        testCustomer,
        originalInvoice,
        "Devolucion por daño desde fabrica"
      );

      if (creditNote && creditNote.documentoElectronico) {
        const validation = fiscalValidator.validateDocument(creditNote);
        if (validation.isValid) {
          results.creditNoteGeneration = true;
          console.log("✅ Credit Note generation successful");
        } else {
          errors.push(`Credit Note validation failed: ${validation.errors.join(', ')}`);
        }
      } else {
        errors.push("Failed to generate Credit Note template");
      }
    } catch (creditError) {
      errors.push(`Credit Note generation failed: ${creditError}`);
    }

    // 2. Test Debit Note Generation
    console.log("2. Testing Debit Note generation...");
    try {
      const debitNote = fiscalTemplateGenerator.generateNotaDebito(
        testInvoice,
        testCustomer,
        originalInvoice,
        "Ajuste por diferencia de precio"
      );

      if (debitNote && debitNote.documentoElectronico) {
        const validation = fiscalValidator.validateDocument(debitNote);
        if (validation.isValid) {
          results.debitNoteGeneration = true;
          console.log("✅ Debit Note generation successful");
        } else {
          errors.push(`Debit Note validation failed: ${validation.errors.join(', ')}`);
        }
      } else {
        errors.push("Failed to generate Debit Note template");
      }
    } catch (debitError) {
      errors.push(`Debit Note generation failed: ${debitError}`);
    }

    // 3. Test Cancellation Document Generation
    console.log("3. Testing Cancellation document generation...");
    try {
      const cancellation = fiscalTemplateGenerator.generateAnulacion(
        "A",
        "00000001",
        TipoDocumentoFiscal.FACTURA,
        "Prueba de anulación"
      );

      if (cancellation) {
        const validation = validateAnulacionDocument(cancellation);
        if (validation.isValid) {
          results.cancellationGeneration = true;
          console.log("✅ Cancellation generation successful");
        } else {
          errors.push(`Cancellation validation failed: ${validation.errors.join(', ')}`);
        }
      } else {
        errors.push("Failed to generate Cancellation document");
      }
    } catch (cancelError) {
      errors.push(`Cancellation generation failed: ${cancelError}`);
    }

    results.validationsPassed = results.creditNoteGeneration && results.debitNoteGeneration && results.cancellationGeneration;

  } catch (error) {
    errors.push(`Test execution failed: ${error}`);
    console.error("❌ Complementary documents test failed:", error);
  }

  const success = Object.values(results).every(result => result);

  console.log("\n📊 Complementary Documents Test Results:");
  console.log(`- Credit Note: ${results.creditNoteGeneration ? '✅' : '❌'}`);
  console.log(`- Debit Note: ${results.debitNoteGeneration ? '✅' : '❌'}`);
  console.log(`- Cancellation: ${results.cancellationGeneration ? '✅' : '❌'}`);
  console.log(`- Overall Success: ${success ? '✅' : '❌'}`);

  return {
    success,
    results,
    errors
  };
}

/**
 * Run comprehensive Phase 4 Step 2 test
 */
export function runPhase4Step2Test(): void {
  console.log("🚀 STARTING PHASE 4 - STEP 2 COMPREHENSIVE TEST");
  console.log("=" .repeat(60));

  // Test base templates (from Step 1)
  const baseTest = testFiscalTemplateGeneration();

  // Test complementary documents (Step 2)
  const complementaryTest = testComplementaryDocuments();

  console.log("\n" + "=".repeat(60));

  if (baseTest.success && complementaryTest.success) {
    console.log("🎉 PHASE 4 - STEP 2 COMPLETED SUCCESSFULLY!");
    console.log("✅ All document types are working correctly:");
    console.log("   • Facturas (Invoices)");
    console.log("   • Notas de Crédito (Credit Notes)");
    console.log("   • Notas de Débito (Debit Notes)");
    console.log("   • Anulaciones (Cancellations)");
    console.log("✅ Ready to proceed to Step 3: Integración BCV Real");
  } else {
    console.log("❌ PHASE 4 - STEP 2 NEEDS FIXES");
    console.log("Please resolve the following issues before proceeding:");

    if (!baseTest.success) {
      console.log("\n❌ Base Templates Issues:");
      baseTest.errors.forEach(error => console.log(`   • ${error}`));
    }

    if (!complementaryTest.success) {
      console.log("\n❌ Complementary Documents Issues:");
      complementaryTest.errors.forEach(error => console.log(`   • ${error}`));
    }
  }
}

// Export test functions for use in components or development
export { testCompanyConfig, testCustomer, testItem, testInvoice };