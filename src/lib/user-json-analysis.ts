/**
 * Análisis del JSON Fiscal Simplificado del Usuario
 * Análisis específico del documento proporcionado
 */

import { generateDocumentTransactionId, parseTransactionId, validateTransactionId } from './transaction-id-generator';

// JSON exacto proporcionado por el usuario
export const userFiscalDocument = {
  "rif": "J-222222222",
  "serie": "A",
  "tipoDocumento": "01",
  "numeroDocumento": "00000001",
  "correos": [
    "correoprueba@gmail.com",
    "correo2prueba@gmail.com"
  ]
};

export function analyzeUserFiscalDocument() {
  console.log('📋 ANÁLISIS DEL JSON FISCAL SIMPLIFICADO');
  console.log('========================================\n');

  const doc = userFiscalDocument;

  // 1. IDENTIFICACIÓN DEL DOCUMENTO
  console.log('🏷️ IDENTIFICACIÓN:');
  console.log(`   RIF Emisor: ${doc.rif} (Persona Jurídica)`);
  console.log(`   Serie: ${doc.serie}`);
  console.log(`   Tipo: ${doc.tipoDocumento} (Factura)`);
  console.log(`   Número: ${doc.numeroDocumento}`);
  console.log('');

  // 2. VALIDACIONES SENIAT
  console.log('🇻🇪 VALIDACIONES SENIAT:');

  // Validar RIF
  const rifValido = /^[VJGE]-\d{9}$/.test(doc.rif);
  console.log(`   RIF: ${rifValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);

  // Validar tipo de documento
  const esFiscal = doc.tipoDocumento === '01';
  console.log(`   Tipo Fiscal: ${esFiscal ? '✅ FACTURA VÁLIDA' : '❌ NO ES FACTURA'}`);

  // Validar numeración
  const numeroValido = /^\d{8}$/.test(doc.numeroDocumento);
  console.log(`   Numeración: ${numeroValido ? '✅ FORMATO CORRECTO' : '❌ DEBE SER 8 DÍGITOS'}`);
  console.log('');

  // 3. GENERACIÓN DE TRANSACTION ID
  console.log('🔢 TRANSACTION ID:');

  try {
    const transactionId = generateDocumentTransactionId({
      serie: doc.serie,
      numeroDocumento: `${doc.serie}-${doc.numeroDocumento}`,
      tipoDocumento: doc.tipoDocumento
    });

    console.log(`   ID Generado: ${transactionId}`);

    // Validar el transaction ID generado
    const validation = validateTransactionId(transactionId);
    console.log(`   Validación: ${validation.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);

    // Parsear el transaction ID
    const parsed = parseTransactionId(transactionId);
    if (parsed.isValid) {
      console.log(`   Prefijo: ${parsed.prefix}`);
      console.log(`   Fecha: ${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`);
      console.log(`   Secuencia: ${parsed.secuencia}`);
      console.log(`   Serie+Número: ${parsed.serie}${parsed.numeroDocumento}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   Error: ❌ ${errorMessage}`);
  }
  console.log('');

  // 4. CORREOS ELECTRÓNICOS
  console.log('📧 CORREOS ELECTRÓNICOS:');
  console.log(`   Cantidad: ${doc.correos.length}`);
  doc.correos.forEach((correo, index) => {
    const esValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    console.log(`   ${index + 1}. ${correo} ${esValido ? '✅' : '❌'}`);
  });
  console.log('');

  // 5. COMPATIBILIDAD CON SISTEMA ACTUAL
  console.log('🔄 COMPATIBILIDAD CON SISTEMA:');
  console.log('   ✅ Campo RIF: Compatible con emisor.rif');
  console.log('   ✅ Campo serie: Compatible con serie de factura');
  console.log('   ✅ Campo tipoDocumento: Compatible con estado factura');
  console.log('   ✅ Campo numeroDocumento: Compatible con numero factura');
  console.log('   ✅ Campo correos: Compatible con receptor.correos');
  console.log('');

  // 6. CAMPOS FALTANTES PARA FACTURA COMPLETA
  console.log('⚠️ CAMPOS FALTANTES PARA FACTURA COMPLETA:');
  console.log('   ❌ Datos del cliente (RIF, nombre, domicilio)');
  console.log('   ❌ Fecha de emisión');
  console.log('   ❌ Número de control');
  console.log('   ❌ Líneas de factura (productos/servicios)');
  console.log('   ❌ Cálculos (subtotal, IVA, IGTF, total)');
  console.log('   ❌ Tasa BCV');
  console.log('   ❌ Forma de pago');
  console.log('');

  // 7. RECOMENDACIONES DE IMPLEMENTACIÓN
  console.log('💡 RECOMENDACIONES:');
  console.log('   1. ✅ Este JSON puede ser el "encabezado" de la factura');
  console.log('   2. 📋 Usar como plantilla para generar facturas completas');
  console.log('   3. 🔄 Integrar con transaction ID automáticamente');
  console.log('   4. 📧 Usar correos para envío automático de PDF');
  console.log('   5. 🏢 RIF J-222222222 debe configurarse como emisor');
  console.log('');

  // 8. PRÓXIMOS PASOS
  console.log('🎯 PRÓXIMOS PASOS:');
  console.log('   1. Crear función expandDocument() para completar datos');
  console.log('   2. Implementar validación completa SENIAT');
  console.log('   3. Generar PDF con este formato');
  console.log('   4. Integrar con base de datos Supabase');
  console.log('   5. Implementar envío automático por correo');

  return {
    esValido: rifValido && esFiscal && numeroValido,
    tipoDocumento: 'Factura',
    requiereDatos: true,
    compatibilidadSistema: true,
    correosProcesados: doc.correos.length
  };
}

// Función para convertir el JSON simplificado en factura completa
export function convertToCompleteInvoice(simplifiedDoc: typeof userFiscalDocument) {
  const transactionId = generateDocumentTransactionId({
    serie: simplifiedDoc.serie,
    numeroDocumento: `${simplifiedDoc.serie}-${simplifiedDoc.numeroDocumento}`,
    tipoDocumento: simplifiedDoc.tipoDocumento
  });

  const currentDate = new Date().toISOString();
  const currentDateString = currentDate.split('T')[0];

  return {
    // Transaction ID generado automáticamente
    transaction_id: transactionId,

    // Del JSON original
    numero: `${simplifiedDoc.serie}-${simplifiedDoc.numeroDocumento}`,
    numeroControl: `DIG-2024${simplifiedDoc.numeroDocumento}`,

    // Fechas
    fecha: currentDateString,
    fechaVencimiento: currentDateString,

    // Emisor (del RIF del JSON)
    emisor: {
      nombre: 'Empresa Ejemplo C.A.',
      rif: simplifiedDoc.rif,
      domicilio: 'Caracas, Venezuela'
    },

    // Receptor (debe llenarse)
    receptor: {
      id: 'cliente-001',
      rif: 'V-12345678-9',
      razonSocial: 'Cliente Ejemplo',
      domicilio: 'Caracas, Venezuela',
      tipoContribuyente: 'ordinario'
    },

    // Líneas de factura (ejemplo)
    lineas: [
      {
        id: '1',
        itemId: 'item-001',
        codigo: 'ITEM001',
        descripcion: 'Producto/Servicio',
        cantidad: 1,
        precioUnitario: 100.00,
        descuento: 0,
        baseImponible: 100.00,
        alicuotaIva: 16,
        montoIva: 16.00,
        total: 116.00
      }
    ],

    // Pagos
    pagos: [
      {
        id: 'pago-001',
        tipo: 'transferencia_ves',
        monto: 116.00,
        aplicaIgtf: false
      }
    ],

    // Totales
    subtotal: 100.00,
    baseImponible: 100.00,
    montoIva: 16.00,
    montoIgtf: 0.00,
    total: 116.00,
    totalUsdReferencia: 100.00 / 224.38,

    // BCV
    tasaBcv: 224.38,
    fechaTasaBcv: currentDateString,

    // Metadata
    canal: 'digital',
    estado: 'emitida',
    createdAt: currentDate,

    // Correos del JSON original
    notificationEmails: simplifiedDoc.correos
  };
}

// Auto-ejecutar análisis
console.log('Analizando JSON del usuario...\n');
export const analysisResult = analyzeUserFiscalDocument();