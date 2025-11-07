/**
 * Integration Test for Transaction ID Generator
 * Tests the integration of transaction ID generation with the quotation and invoice systems
 */

import {
  generateTransactionId,
  generateDocumentTransactionId,
  parseTransactionId,
  validateTransactionId
} from './transaction-id-generator';

// Test data that mimics real quotation and invoice creation
const testQuotationData = {
  serie: 'COT',
  numeroDocumento: 'COT-202411-001',
  tipoDocumento: '04' // Cotización/Presupuesto
};

const testInvoiceData = {
  serie: 'FAC',
  numeroDocumento: 'FAC-000001',
  tipoDocumento: '01' // Factura
};

const testCreditNoteData = {
  serie: 'FAC',
  numeroDocumento: 'FAC-000002',
  tipoDocumento: '02' // Nota de Crédito
};

const testDebitNoteData = {
  serie: 'FAC',
  numeroDocumento: 'FAC-000003',
  tipoDocumento: '03' // Nota de Débito
};

export function runTransactionIdIntegrationTests() {
  console.log('🧪 Running Transaction ID Integration Tests...\n');

  try {
    // Test 1: Quotation Transaction ID Generation
    console.log('📋 Test 1: Quotation Transaction ID Generation');
    const quotationTxnId = generateDocumentTransactionId(testQuotationData);
    console.log(`Generated Quotation Transaction ID: ${quotationTxnId}`);
    console.log(`Expected format: ANU_YYYYMMDDSS_COTXXXXXXXX`);

    const quotationValidation = validateTransactionId(quotationTxnId);
    console.log(`Validation result: ${quotationValidation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!quotationValidation.isValid) {
      console.log(`Error: ${quotationValidation.error}`);
    }
    console.log('');

    // Test 2: Invoice Transaction ID Generation
    console.log('🧾 Test 2: Invoice Transaction ID Generation');
    const invoiceTxnId = generateDocumentTransactionId(testInvoiceData);
    console.log(`Generated Invoice Transaction ID: ${invoiceTxnId}`);
    console.log(`Expected format: FAC_YYYYMMDDSS_FACXXXXXXXX`);

    const invoiceValidation = validateTransactionId(invoiceTxnId);
    console.log(`Validation result: ${invoiceValidation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!invoiceValidation.isValid) {
      console.log(`Error: ${invoiceValidation.error}`);
    }
    console.log('');

    // Test 3: Credit Note Transaction ID Generation
    console.log('💳 Test 3: Credit Note Transaction ID Generation');
    const creditNoteTxnId = generateDocumentTransactionId(testCreditNoteData);
    console.log(`Generated Credit Note Transaction ID: ${creditNoteTxnId}`);
    console.log(`Expected format: NCR_YYYYMMDDSS_FACXXXXXXXX`);

    const creditNoteValidation = validateTransactionId(creditNoteTxnId);
    console.log(`Validation result: ${creditNoteValidation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!creditNoteValidation.isValid) {
      console.log(`Error: ${creditNoteValidation.error}`);
    }
    console.log('');

    // Test 4: Debit Note Transaction ID Generation
    console.log('📈 Test 4: Debit Note Transaction ID Generation');
    const debitNoteTxnId = generateDocumentTransactionId(testDebitNoteData);
    console.log(`Generated Debit Note Transaction ID: ${debitNoteTxnId}`);
    console.log(`Expected format: NDB_YYYYMMDDSS_FACXXXXXXXX`);

    const debitNoteValidation = validateTransactionId(debitNoteTxnId);
    console.log(`Validation result: ${debitNoteValidation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!debitNoteValidation.isValid) {
      console.log(`Error: ${debitNoteValidation.error}`);
    }
    console.log('');

    // Test 5: Parse and analyze transaction IDs
    console.log('🔍 Test 5: Transaction ID Parsing and Analysis');

    const allTxnIds = [quotationTxnId, invoiceTxnId, creditNoteTxnId, debitNoteTxnId];
    const labels = ['Quotation', 'Invoice', 'Credit Note', 'Debit Note'];

    allTxnIds.forEach((txnId, index) => {
      console.log(`\n${labels[index]} Transaction ID: ${txnId}`);
      const parsed = parseTransactionId(txnId);
      if (parsed.isValid) {
        console.log(`  ✅ Prefix: ${parsed.prefix}`);
        console.log(`  📅 Date: ${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`);
        console.log(`  🔢 Sequence: ${parsed.secuencia}`);
        console.log(`  📋 Serie: ${parsed.serie}`);
        console.log(`  🏷️  Document Number: ${parsed.numeroDocumento}`);
      } else {
        console.log(`  ❌ Invalid transaction ID format`);
      }
    });

    // Test 6: Sequential transaction ID generation
    console.log('\n🔄 Test 6: Sequential Transaction ID Generation');
    const firstTxnId = generateTransactionId({ serie: 'TEST', numeroDocumento: 'TEST-001' });
    const secondTxnId = generateTransactionId({ serie: 'TEST', numeroDocumento: 'TEST-002' });

    console.log(`First Transaction ID: ${firstTxnId}`);
    console.log(`Second Transaction ID: ${secondTxnId}`);

    const firstParsed = parseTransactionId(firstTxnId);
    const secondParsed = parseTransactionId(secondTxnId);

    if (firstParsed.isValid && secondParsed.isValid) {
      const firstSequence = parseInt(firstParsed.secuencia);
      const secondSequence = parseInt(secondParsed.secuencia);
      const isSequential = secondSequence === firstSequence + 1;

      console.log(`Sequential generation: ${isSequential ? '✅ WORKING' : '❌ FAILED'}`);
      console.log(`First sequence: ${firstSequence}, Second sequence: ${secondSequence}`);
    }

    console.log('\n🎉 All Transaction ID Integration Tests Completed!');
    return true;

  } catch (error) {
    console.error('❌ Transaction ID Integration Test Failed:', error);
    return false;
  }
}

// Export for use in other tests or components
export {
  testQuotationData,
  testInvoiceData,
  testCreditNoteData,
  testDebitNoteData
};

// Self-executing test when file is run directly
if (typeof window === 'undefined') {
  // This runs in Node.js environment (not browser)
  runTransactionIdIntegrationTests();
}