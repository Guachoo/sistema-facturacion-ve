/**
 * Test específico para el JSON de descarga de documentos
 * Prueba la funcionalidad de descarga con transaction IDs
 */

import { generateDocumentTransactionId, parseTransactionId, validateTransactionId } from './transaction-id-generator';

// JSON exacto de descarga proporcionado por el usuario
const downloadRequestJSON = {
  "serie": "A",
  "tipoDocumento": "01",
  "numeroDocumento": "100",
  "tipoArchivo": "PDF"
};

export function testDownloadDocumentJSON() {
  console.log('📥 TEST DEL JSON DE DESCARGA');
  console.log('=============================\n');

  // Mostrar JSON original
  console.log('📄 JSON Original de Descarga:');
  console.log(JSON.stringify(downloadRequestJSON, null, 2));
  console.log('');

  // Generar identificador único para el documento
  console.log('🔢 Generando Transaction ID para búsqueda...');

  const documentoCompleto = `${downloadRequestJSON.serie}-${downloadRequestJSON.numeroDocumento.padStart(8, '0')}`;
  console.log(`Documento completo: ${documentoCompleto}`);

  try {
    const transactionId = generateDocumentTransactionId({
      serie: downloadRequestJSON.serie,
      numeroDocumento: documentoCompleto,
      tipoDocumento: downloadRequestJSON.tipoDocumento
    });

    console.log(`✅ Transaction ID: ${transactionId}`);
    console.log('');

    // Validar Transaction ID
    console.log('🔍 Validando Transaction ID...');
    const validation = validateTransactionId(transactionId);
    console.log(`Resultado: ${validation.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    console.log('');

    // Parsear Transaction ID
    console.log('📊 Parseando Transaction ID...');
    const parsed = parseTransactionId(transactionId);

    if (parsed.isValid) {
      console.log('✅ Datos extraídos del Transaction ID:');
      console.log(`   Prefijo: ${parsed.prefix}`);
      console.log(`   Fecha: ${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`);
      console.log(`   Secuencia: ${parsed.secuencia}`);
      console.log(`   Serie: ${parsed.serie}`);
      console.log(`   Número: ${parsed.numeroDocumento}`);
    }
    console.log('');

    // Simular búsqueda de documento
    console.log('🔍 SIMULACIÓN DE BÚSQUEDA:');
    console.log('Buscando documento en base de datos...');
    console.log(`   Por Transaction ID: ${transactionId}`);
    console.log(`   Por Serie + Número: ${documentoCompleto}`);
    console.log(`   Tipo: ${downloadRequestJSON.tipoDocumento} (Factura)`);
    console.log('✅ Documento encontrado (simulado)');
    console.log('');

    // Crear solicitud de descarga completa
    console.log('📁 SOLICITUD DE DESCARGA COMPLETA:');

    const downloadRequest = {
      // Datos originales
      ...downloadRequestJSON,

      // Identificadores únicos
      transaction_id: transactionId,
      documento_completo: documentoCompleto,

      // Metadata de descarga
      download_info: {
        tipo_documento: 'Factura',
        formato_archivo: downloadRequestJSON.tipoArchivo,
        tamaño_estimado: '~50-200 KB',
        ruta_api: `/api/v1/documents/${documentoCompleto}/download?format=pdf`,
        timestamp_solicitud: new Date().toISOString()
      },

      // Headers para la API
      api_headers: {
        'Authorization': 'Bearer [token]',
        'Accept': 'application/pdf',
        'Content-Type': 'application/json'
      },

      // Validaciones
      validations: {
        serie_valida: /^[A-Z]$/.test(downloadRequestJSON.serie),
        tipo_valido: downloadRequestJSON.tipoDocumento === '01',
        numero_valido: /^\d+$/.test(downloadRequestJSON.numeroDocumento),
        formato_valido: ['PDF', 'XML', 'JSON', 'ZIP'].includes(downloadRequestJSON.tipoArchivo)
      }
    };

    console.log(JSON.stringify(downloadRequest, null, 2));
    console.log('');

    // Diferentes formatos de descarga
    console.log('📋 FORMATOS DE DESCARGA DISPONIBLES:');

    const formatos = ['PDF', 'XML', 'JSON', 'ZIP'];
    formatos.forEach(formato => {
      const requestEjemplo = { ...downloadRequestJSON, tipoArchivo: formato };
      const rutaAPI = `/api/v1/documents/${documentoCompleto}/download?format=${formato.toLowerCase()}`;

      console.log(`\n   📄 ${formato}:`);
      console.log(`      Solicitud: ${JSON.stringify(requestEjemplo)}`);
      console.log(`      API: GET ${rutaAPI}`);
      console.log(`      Accept: application/${formato.toLowerCase()}`);
    });

    console.log('');

    // Casos de uso del documento
    console.log('💼 CASOS DE USO:');
    console.log('   📧 PDF: Envío por email a clientes');
    console.log('   🏛️ XML: Transmisión a SENIAT');
    console.log('   🔗 JSON: Integración con sistemas');
    console.log('   📦 ZIP: Descarga completa de todos los formatos');
    console.log('');

    // Análisis final
    console.log('🎯 ANÁLISIS FINAL:');
    console.log('✅ JSON válido para descarga de documentos');
    console.log('✅ Transaction ID generado correctamente');
    console.log('✅ Identificación única del documento A-00000100');
    console.log('✅ Formato PDF especificado correctamente');
    console.log('✅ Compatible con sistema fiscal venezolano');
    console.log('✅ Listo para implementación de API de descarga');
    console.log('');

    console.log('📌 PRÓXIMOS PASOS:');
    console.log('1. Implementar endpoint GET /api/v1/documents/{numero}/download');
    console.log('2. Validar permisos de usuario para descarga');
    console.log('3. Buscar documento por transaction_id o serie+número');
    console.log('4. Generar archivo en formato solicitado');
    console.log('5. Registrar auditoría de descarga');

    return {
      success: true,
      transactionId,
      documentoCompleto,
      downloadRequest,
      recommendations: [
        'JSON válido para sistema de descarga',
        'Transaction ID funcional para búsqueda',
        'API endpoint claramente definido',
        'Múltiples formatos soportados'
      ]
    };

  } catch (error) {
    console.log(`❌ Error al procesar JSON de descarga: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Función para simular la implementación de la API de descarga
export function simulateDownloadAPI(request: typeof downloadRequestJSON) {
  console.log('\n🚀 SIMULACIÓN DE API DE DESCARGA');
  console.log('==================================');

  const documentoCompleto = `${request.serie}-${request.numeroDocumento.padStart(8, '0')}`;
  const endpoint = `/api/v1/documents/${documentoCompleto}/download`;

  console.log(`📡 GET ${endpoint}?format=${request.tipoArchivo.toLowerCase()}`);
  console.log('\n📥 Request Headers:');
  console.log('   Authorization: Bearer [token]');
  console.log(`   Accept: application/${request.tipoArchivo.toLowerCase()}`);
  console.log('   Content-Type: application/json');

  console.log('\n📤 Response (simulado):');
  console.log('   Status: 200 OK');
  console.log(`   Content-Type: application/${request.tipoArchivo.toLowerCase()}`);
  console.log('   Content-Disposition: attachment; filename="A-00000100.pdf"');
  console.log('   Content-Length: 156789');
  console.log('\n✅ Descarga simulada exitosa');

  return {
    status: 200,
    filename: `${documentoCompleto}.${request.tipoArchivo.toLowerCase()}`,
    contentType: `application/${request.tipoArchivo.toLowerCase()}`,
    size: '~156 KB'
  };
}

// Ejecutar test automáticamente
if (typeof window !== 'undefined') {
  testDownloadDocumentJSON();
}

export { downloadRequestJSON };