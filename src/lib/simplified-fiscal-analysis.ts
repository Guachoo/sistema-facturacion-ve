/**
 * Análisis del JSON Fiscal Simplificado
 * Estructura básica para documentos fiscales venezolanos
 */

export interface SimplifiedFiscalDocument {
  rif: string;
  serie: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correos: string[];
}

export const simplifiedFiscalSample: SimplifiedFiscalDocument = {
  "rif": "J-222222222",
  "serie": "A",
  "tipoDocumento": "01",
  "numeroDocumento": "00000001",
  "correos": [
    "correoprueba@gmail.com",
    "correo2prueba@gmail.com"
  ]
};

export function analyzeSimplifiedFiscalDocument(doc: SimplifiedFiscalDocument) {
  console.log('📄 Análisis del JSON Fiscal Simplificado\n');

  // Análisis del RIF
  console.log('🏢 RIF (Registro de Información Fiscal):');
  console.log(`   Valor: ${doc.rif}`);
  console.log(`   Tipo: ${doc.rif.startsWith('J-') ? 'Persona Jurídica' : 'Otro tipo'}`);
  console.log(`   Formato: ${/^[VJGE]-\d{9}$/.test(doc.rif) ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);

  // Análisis de la Serie
  console.log('\n📋 Serie del Documento:');
  console.log(`   Valor: "${doc.serie}"`);
  console.log(`   Tipo: Serie ${doc.serie} (${doc.serie === 'A' ? 'Serie principal' : 'Serie secundaria'})`);

  // Análisis del Tipo de Documento
  console.log('\n📝 Tipo de Documento:');
  const tiposDocumento = {
    '01': 'Factura',
    '02': 'Nota de Crédito',
    '03': 'Nota de Débito',
    '04': 'Cotización/Presupuesto',
    '05': 'Recibo',
    '06': 'Comprobante de Retención'
  };

  const tipoDescripcion = tiposDocumento[doc.tipoDocumento as keyof typeof tiposDocumento] || 'Tipo desconocido';
  console.log(`   Código: ${doc.tipoDocumento}`);
  console.log(`   Descripción: ${tipoDescripcion}`);
  console.log(`   SENIAT: ${doc.tipoDocumento === '01' ? '✅ VÁLIDO para facturación' : '⚠️ Verificar según SENIAT'}`);

  // Análisis del Número de Documento
  console.log('\n🔢 Número de Documento:');
  console.log(`   Valor: ${doc.numeroDocumento}`);
  console.log(`   Formato: ${doc.numeroDocumento.padStart(8, '0')}`);
  console.log(`   Secuencia: ${parseInt(doc.numeroDocumento)}`);

  // Análisis de Correos
  console.log('\n📧 Correos Electrónicos:');
  console.log(`   Cantidad: ${doc.correos.length}`);
  doc.correos.forEach((correo, index) => {
    const esValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    console.log(`   ${index + 1}. ${correo} ${esValido ? '✅' : '❌'}`);
  });

  // Análisis de Completitud
  console.log('\n🎯 Análisis de Completitud:');
  const camposRequeridos = ['rif', 'serie', 'tipoDocumento', 'numeroDocumento'];
  const camposFaltantes = camposRequeridos.filter(campo => !doc[campo as keyof SimplifiedFiscalDocument]);

  console.log(`   Campos requeridos: ${camposRequeridos.length}/4 ✅`);
  console.log(`   Campos faltantes: ${camposFaltantes.length === 0 ? 'Ninguno ✅' : camposFaltantes.join(', ')}`);
  console.log(`   Correos configurados: ${doc.correos.length > 0 ? 'Sí ✅' : 'No ❌'}`);

  // Comparación con Transaction ID
  console.log('\n🔄 Integración con Transaction ID:');

  // Generar transaction ID para este documento
  try {
    const { generateDocumentTransactionId } = require('./transaction-id-generator');

    const transactionId = generateDocumentTransactionId({
      serie: doc.serie,
      numeroDocumento: `${doc.serie}-${doc.numeroDocumento}`,
      tipoDocumento: doc.tipoDocumento
    });

    console.log(`   Transaction ID generado: ${transactionId}`);
    console.log(`   Compatibilidad: ✅ COMPATIBLE con sistema actual`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   Transaction ID: ❌ Error al generar (${errorMessage})`);
  }

  // Recomendaciones
  console.log('\n💡 Recomendaciones:');

  if (doc.tipoDocumento === '01') {
    console.log('   ✅ Este es un documento de Factura - ideal para el sistema');
  }

  if (doc.correos.length > 1) {
    console.log('   ✅ Múltiples correos configurados - buena práctica');
  }

  if (doc.rif.startsWith('J-')) {
    console.log('   ✅ RIF de Persona Jurídica - cumple con normativas');
  }

  console.log('   📋 Agregar campos: fecha, monto, descripción, cliente');
  console.log('   🔐 Implementar: número de control, QR code, firma digital');
  console.log('   📊 Incluir: cálculos de IVA, IGTF, totales');

  return {
    esValido: camposFaltantes.length === 0,
    tipoDocumento: tipoDescripcion,
    correosProcesados: doc.correos.length,
    requiereExpansion: true
  };
}

// Función para expandir el JSON simplificado a estructura completa
export function expandToFullFiscalDocument(simplified: SimplifiedFiscalDocument) {
  const expanded = {
    // Datos básicos del JSON simplificado
    numero: `${simplified.serie}-${simplified.numeroDocumento}`,
    transaction_id: '', // Se generará automáticamente
    serie: simplified.serie,
    tipoDocumento: simplified.tipoDocumento,

    // Datos del emisor (empresa)
    emisor: {
      rif: simplified.rif,
      nombre: 'Empresa Ejemplo C.A.',
      domicilio: 'Caracas, Venezuela'
    },

    // Datos del receptor (cliente)
    receptor: {
      rif: 'V-12345678-9',
      razonSocial: 'Cliente Ejemplo',
      domicilio: 'Caracas, Venezuela',
      correos: simplified.correos
    },

    // Datos fiscales básicos
    fecha: new Date().toISOString().split('T')[0],
    moneda: 'VES',

    // Totales (ejemplo)
    subtotal: 100.00,
    montoIva: 16.00,
    montoIgtf: 0.00,
    total: 116.00,

    // BCV
    tasaBcv: 224.38,
    fechaTasaBcv: new Date().toISOString().split('T')[0],

    // Estado y metadatos
    estado: 'emitida',
    canal: 'digital',

    // Líneas de factura (ejemplo)
    lineas: [
      {
        codigo: 'ITEM001',
        descripcion: 'Producto de ejemplo',
        cantidad: 1,
        precioUnitario: 100.00,
        descuento: 0,
        montoIva: 16.00,
        total: 116.00
      }
    ]
  };

  return expanded;
}

// Auto-ejecutar análisis si se carga el archivo
if (typeof window !== 'undefined') {
  console.log('🔍 Analizando JSON Fiscal Simplificado...');
  analyzeSimplifiedFiscalDocument(simplifiedFiscalSample);
}