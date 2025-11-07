/**
 * Análisis del JSON de Descarga de Documentos
 * Sistema para descargar documentos fiscales en diferentes formatos
 */

import { generateDocumentTransactionId, parseTransactionId } from './transaction-id-generator';

// JSON exacto para descarga de documentos
export const downloadDocumentRequest = {
  "serie": "A",
  "tipoDocumento": "01",
  "numeroDocumento": "100",
  "tipoArchivo": "PDF"
};

export interface DownloadDocumentRequest {
  serie: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tipoArchivo: 'PDF' | 'XML' | 'JSON' | 'ZIP';
}

export function analyzeDownloadDocumentRequest() {
  console.log('📥 ANÁLISIS DEL JSON DE DESCARGA');
  console.log('================================\n');

  const doc = downloadDocumentRequest;

  // 1. INFORMACIÓN DEL DOCUMENTO
  console.log('📄 DOCUMENTO SOLICITADO:');
  console.log(`   Serie: ${doc.serie}`);
  console.log(`   Tipo: ${doc.tipoDocumento} (${getTipoDocumentoDescription(doc.tipoDocumento)})`);
  console.log(`   Número: ${doc.numeroDocumento}`);
  console.log(`   Formato: ${doc.tipoArchivo}`);
  console.log('');

  // 2. GENERAR IDENTIFICADOR ÚNICO PARA BÚSQUEDA
  console.log('🔍 IDENTIFICACIÓN DEL DOCUMENTO:');

  const documentoCompleto = `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`;
  console.log(`   Número completo: ${documentoCompleto}`);

  // Generar transaction ID para este documento
  const transactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: documentoCompleto,
    tipoDocumento: doc.tipoDocumento
  });

  console.log(`   Transaction ID: ${transactionId}`);
  console.log('');

  // 3. VALIDACIONES DE FORMATO
  console.log('✅ VALIDACIONES:');

  // Validar serie
  const serieValida = /^[A-Z]$/.test(doc.serie);
  console.log(`   Serie: ${serieValida ? '✅ VÁLIDA' : '❌ INVÁLIDA'} (${doc.serie})`);

  // Validar tipo de documento
  const tipoValido = ['01', '02', '03', '04', '05', '06'].includes(doc.tipoDocumento);
  console.log(`   Tipo: ${tipoValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${doc.tipoDocumento})`);

  // Validar número
  const numeroValido = /^\d+$/.test(doc.numeroDocumento);
  console.log(`   Número: ${numeroValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${doc.numeroDocumento})`);

  // Validar formato de archivo
  const formatosPermitidos = ['PDF', 'XML', 'JSON', 'ZIP'];
  const formatoValido = formatosPermitidos.includes(doc.tipoArchivo);
  console.log(`   Formato: ${formatoValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${doc.tipoArchivo})`);
  console.log('');

  // 4. INFORMACIÓN DEL ARCHIVO SOLICITADO
  console.log('📁 INFORMACIÓN DEL ARCHIVO:');
  console.log(`   Tipo: ${doc.tipoArchivo}`);
  console.log(`   Descripción: ${getFileTypeDescription(doc.tipoArchivo)}`);
  console.log(`   Uso: ${getFileTypeUsage(doc.tipoArchivo)}`);
  console.log('');

  // 5. RUTA DE DESCARGA SUGERIDA
  console.log('🔗 SISTEMA DE DESCARGA:');
  const downloadPath = generateDownloadPath(doc);
  console.log(`   Ruta API: ${downloadPath}`);
  console.log(`   Método: GET`);
  console.log(`   Headers: Authorization: Bearer [token]`);
  console.log('');

  // 6. METADATA DEL DOCUMENTO
  console.log('📊 METADATA:');
  console.log(`   Documento fiscal: ${getTipoDocumentoDescription(doc.tipoDocumento)}`);
  console.log(`   Serie completa: ${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`);
  console.log(`   Archivo: ${doc.tipoArchivo} (${getFileSize(doc.tipoArchivo)})`);
  console.log(`   SENIAT: ${doc.tipoDocumento === '01' ? 'Documento fiscal válido' : 'Verificar con SENIAT'}`);
  console.log('');

  // 7. INTEGRACIÓN CON SISTEMA ACTUAL
  console.log('🔄 INTEGRACIÓN:');
  console.log('   ✅ Compatible con sistema de transaction IDs');
  console.log('   ✅ Puede buscar por serie + número');
  console.log('   ✅ Formato de descarga especificado');
  console.log('   ✅ Listo para API de documentos');
  console.log('');

  // 8. RECOMENDACIONES
  console.log('💡 RECOMENDACIONES:');
  console.log('   1. Implementar API endpoint: GET /api/documents/download');
  console.log('   2. Validar permisos de usuario antes de descarga');
  console.log('   3. Registrar auditoría de descargas');
  console.log('   4. Cachear documentos PDF para mayor velocidad');
  console.log('   5. Implementar límite de descargas por usuario/día');

  return {
    esValido: serieValida && tipoValido && numeroValido && formatoValido,
    documentoCompleto,
    transactionId,
    downloadPath,
    tipoDescripcion: getTipoDocumentoDescription(doc.tipoDocumento)
  };
}

function getTipoDocumentoDescription(tipo: string): string {
  const tipos = {
    '01': 'Factura',
    '02': 'Nota de Crédito',
    '03': 'Nota de Débito',
    '04': 'Cotización/Presupuesto',
    '05': 'Recibo de Pago',
    '06': 'Comprobante de Retención'
  };
  return tipos[tipo as keyof typeof tipos] || 'Tipo desconocido';
}

function getFileTypeDescription(tipo: string): string {
  const descripciones = {
    'PDF': 'Documento portable para visualización',
    'XML': 'Estructura de datos fiscal para SENIAT',
    'JSON': 'Datos estructurados para integración',
    'ZIP': 'Archivo comprimido con múltiples formatos'
  };
  return descripciones[tipo as keyof typeof descripciones] || 'Formato desconocido';
}

function getFileTypeUsage(tipo: string): string {
  const usos = {
    'PDF': 'Impresión, envío por email, archivo físico',
    'XML': 'Transmisión a SENIAT, validación fiscal',
    'JSON': 'Integración con sistemas, APIs, base de datos',
    'ZIP': 'Descarga completa (PDF + XML + JSON)'
  };
  return usos[tipo as keyof typeof usos] || 'Uso desconocido';
}

function getFileSize(tipo: string): string {
  const tamaños = {
    'PDF': '~50-200 KB',
    'XML': '~5-20 KB',
    'JSON': '~3-15 KB',
    'ZIP': '~60-235 KB'
  };
  return tamaños[tipo as keyof typeof tamaños] || 'Tamaño variable';
}

function generateDownloadPath(doc: typeof downloadDocumentRequest): string {
  const documentoCompleto = `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`;
  return `/api/v1/documents/${documentoCompleto}/download?format=${doc.tipoArchivo.toLowerCase()}`;
}

// Función para crear la solicitud de descarga completa
export function createDownloadRequest(doc: typeof downloadDocumentRequest) {
  const transactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`,
    tipoDocumento: doc.tipoDocumento
  });

  return {
    // Datos originales del JSON
    ...doc,

    // Datos enriquecidos
    transaction_id: transactionId,
    documento_completo: `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`,
    tipo_descripcion: getTipoDocumentoDescription(doc.tipoDocumento),
    archivo_descripcion: getFileTypeDescription(doc.tipoArchivo),

    // Metadata de descarga
    download_metadata: {
      formato: doc.tipoArchivo,
      tamaño_estimado: getFileSize(doc.tipoArchivo),
      uso_recomendado: getFileTypeUsage(doc.tipoArchivo),
      ruta_api: generateDownloadPath(doc),
      timestamp: new Date().toISOString()
    },

    // Headers requeridos para la API
    api_request: {
      method: 'GET',
      url: generateDownloadPath(doc),
      headers: {
        'Authorization': 'Bearer [auth_token]',
        'Accept': `application/${doc.tipoArchivo.toLowerCase()}`,
        'Content-Type': 'application/json'
      }
    }
  };
}

// Auto-ejecutar análisis
console.log('Analizando JSON de descarga de documentos...\n');
export const downloadAnalysisResult = analyzeDownloadDocumentRequest();