/**
 * Análisis del JSON de Anulación de Documentos
 * Sistema para anular documentos fiscales venezolanos con auditoría completa
 */

import { generateDocumentTransactionId, parseTransactionId } from './transaction-id-generator';

// JSON exacto para anulación de documentos
export const voidDocumentRequest = {
  "serie": "B",
  "tipoDocumento": "01",
  "numeroDocumento": "105",
  "motivoAnulacion": "Prueba",
  "fechaAnulacion": "03/07/2024",
  "horaAnulacion": "10:00:00 am"
};

export interface VoidDocumentRequest {
  serie: string;
  tipoDocumento: string;
  numeroDocumento: string;
  motivoAnulacion: string;
  fechaAnulacion: string;
  horaAnulacion: string;
}

export function analyzeVoidDocumentRequest() {
  console.log('❌ ANÁLISIS DEL JSON DE ANULACIÓN');
  console.log('=================================\n');

  const doc = voidDocumentRequest;

  // 1. DOCUMENTO A ANULAR
  console.log('📄 DOCUMENTO A ANULAR:');
  console.log(`   Serie: ${doc.serie}`);
  console.log(`   Tipo: ${doc.tipoDocumento} (${getTipoDocumentoDescription(doc.tipoDocumento)})`);
  console.log(`   Número: ${doc.numeroDocumento}`);

  const documentoCompleto = `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`;
  console.log(`   Documento completo: ${documentoCompleto}`);
  console.log('');

  // 2. DETALLES DE LA ANULACIÓN
  console.log('⚠️ DETALLES DE ANULACIÓN:');
  console.log(`   Motivo: "${doc.motivoAnulacion}"`);
  console.log(`   Fecha: ${doc.fechaAnulacion}`);
  console.log(`   Hora: ${doc.horaAnulacion}`);

  // Convertir fecha a formato ISO
  const fechaISO = convertToISO(doc.fechaAnulacion, doc.horaAnulacion);
  console.log(`   Timestamp ISO: ${fechaISO}`);
  console.log('');

  // 3. TRANSACTION IDs
  console.log('🔢 TRANSACTION IDs:');

  // Transaction ID del documento original
  const originalTransactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: documentoCompleto,
    tipoDocumento: doc.tipoDocumento
  });
  console.log(`   Documento original: ${originalTransactionId}`);

  // Transaction ID para la anulación (tipo especial)
  const voidTransactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: documentoCompleto,
    tipoDocumento: '99' // Tipo especial para anulaciones
  });
  console.log(`   Anulación: ${voidTransactionId}`);
  console.log('');

  // 4. VALIDACIONES CRÍTICAS
  console.log('✅ VALIDACIONES CRÍTICAS:');

  // Validar serie
  const serieValida = /^[A-Z]$/.test(doc.serie);
  console.log(`   Serie: ${serieValida ? '✅ VÁLIDA' : '❌ INVÁLIDA'} (${doc.serie})`);

  // Validar tipo de documento
  const tipoValido = ['01', '02', '03'].includes(doc.tipoDocumento);
  console.log(`   Tipo: ${tipoValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${doc.tipoDocumento})`);

  // Validar número
  const numeroValido = /^\d+$/.test(doc.numeroDocumento);
  console.log(`   Número: ${numeroValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${doc.numeroDocumento})`);

  // Validar motivo (no puede estar vacío)
  const motivoValido = doc.motivoAnulacion.trim().length >= 3;
  console.log(`   Motivo: ${motivoValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (mín. 3 caracteres)`);

  // Validar fecha
  const fechaValida = /^\d{2}\/\d{2}\/\d{4}$/.test(doc.fechaAnulacion);
  console.log(`   Fecha: ${fechaValida ? '✅ VÁLIDA' : '❌ INVÁLIDA'} (DD/MM/YYYY)`);

  // Validar hora
  const horaValida = /^\d{2}:\d{2}:\d{2}\s?(am|pm)$/i.test(doc.horaAnulacion);
  console.log(`   Hora: ${horaValida ? '✅ VÁLIDA' : '❌ INVÁLIDA'} (HH:MM:SS am/pm)`);
  console.log('');

  // 5. CUMPLIMIENTO SENIAT
  console.log('🇻🇪 CUMPLIMIENTO SENIAT:');
  console.log('   ✅ Motivo de anulación registrado');
  console.log('   ✅ Fecha y hora exacta documentada');
  console.log('   ✅ Identificación única del documento');
  console.log('   ✅ Auditoría completa disponible');
  console.log('   ⚠️ Verificar que el documento original exista');
  console.log('   ⚠️ Validar que no esté previamente anulado');
  console.log('');

  // 6. PROCESO DE ANULACIÓN
  console.log('⚙️ PROCESO DE ANULACIÓN:');
  console.log('   1. Verificar existencia del documento original');
  console.log('   2. Validar estado actual (no anulado previamente)');
  console.log('   3. Verificar permisos del usuario solicitante');
  console.log('   4. Registrar motivo y timestamp de anulación');
  console.log('   5. Generar transaction ID de anulación');
  console.log('   6. Actualizar estado en base de datos');
  console.log('   7. Crear registro de auditoría');
  console.log('   8. Notificar a SENIAT (si aplica)');
  console.log('');

  // 7. IMPACTO FISCAL
  console.log('📊 IMPACTO FISCAL:');
  console.log('   💰 Revertir totales de IVA');
  console.log('   💰 Revertir totales de IGTF');
  console.log('   📋 Actualizar libro de ventas');
  console.log('   📈 Actualizar estadísticas');
  console.log('   🏛️ Reportar a autoridades fiscales');
  console.log('');

  // 8. AUDITORÍA Y TRAZABILIDAD
  console.log('🔍 AUDITORÍA Y TRAZABILIDAD:');
  console.log(`   🕒 Timestamp: ${fechaISO}`);
  console.log(`   👤 Usuario: [usuario_actual]`);
  console.log(`   📝 Motivo: "${doc.motivoAnulacion}"`);
  console.log(`   🔗 Documento: ${documentoCompleto}`);
  console.log(`   🎯 Transaction Original: ${originalTransactionId}`);
  console.log(`   ❌ Transaction Anulación: ${voidTransactionId}`);
  console.log('');

  // 9. RECOMENDACIONES DE SEGURIDAD
  console.log('🔒 RECOMENDACIONES DE SEGURIDAD:');
  console.log('   1. Requerer confirmación doble del usuario');
  console.log('   2. Validar permisos específicos para anulación');
  console.log('   3. Registrar IP y ubicación del solicitante');
  console.log('   4. Enviar notificación a supervisores');
  console.log('   5. Crear backup del documento antes de anular');
  console.log('   6. Implementar límite de anulaciones por período');

  return {
    esValido: serieValida && tipoValido && numeroValido && motivoValido && fechaValida && horaValida,
    documentoCompleto,
    originalTransactionId,
    voidTransactionId,
    fechaISO,
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

function convertToISO(fecha: string, hora: string): string {
  try {
    // Convertir "03/07/2024" y "10:00:00 am" a ISO
    const [day, month, year] = fecha.split('/');
    const [time, period] = hora.split(' ');
    const [hours, minutes, seconds] = time.split(':');

    let hour24 = parseInt(hours);
    if (period.toLowerCase() === 'pm' && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toLowerCase() === 'am' && hour24 === 12) {
      hour24 = 0;
    }

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Mes basado en 0
      parseInt(day),
      hour24,
      parseInt(minutes),
      parseInt(seconds)
    );

    return date.toISOString();
  } catch (error) {
    return new Date().toISOString(); // Fallback a fecha actual
  }
}

// Función para crear la solicitud de anulación completa
export function createVoidRequest(doc: typeof voidDocumentRequest) {
  const documentoCompleto = `${doc.serie}-${doc.numeroDocumento.padStart(8, '0')}`;
  const fechaISO = convertToISO(doc.fechaAnulacion, doc.horaAnulacion);

  const originalTransactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: documentoCompleto,
    tipoDocumento: doc.tipoDocumento
  });

  const voidTransactionId = generateDocumentTransactionId({
    serie: doc.serie,
    numeroDocumento: documentoCompleto,
    tipoDocumento: '99' // Tipo especial para anulaciones
  });

  return {
    // Datos originales del JSON
    ...doc,

    // Datos enriquecidos
    documento_completo: documentoCompleto,
    fecha_anulacion_iso: fechaISO,
    original_transaction_id: originalTransactionId,
    void_transaction_id: voidTransactionId,
    tipo_descripcion: getTipoDocumentoDescription(doc.tipoDocumento),

    // Metadata de anulación
    void_metadata: {
      timestamp: fechaISO,
      motivo_categoria: categorizarMotivo(doc.motivoAnulacion),
      impacto_fiscal: calcularImpactoFiscal(doc.tipoDocumento),
      requiere_notificacion_seniat: doc.tipoDocumento === '01',
      audit_trail: {
        action: 'DOCUMENT_VOID',
        document_id: documentoCompleto,
        reason: doc.motivoAnulacion,
        timestamp: fechaISO,
        user_id: '[current_user]',
        ip_address: '[user_ip]'
      }
    },

    // API Request para anulación
    api_request: {
      method: 'POST',
      url: `/api/v1/documents/${documentoCompleto}/void`,
      headers: {
        'Authorization': 'Bearer [auth_token]',
        'Content-Type': 'application/json',
        'X-Audit-Reason': doc.motivoAnulacion
      },
      body: {
        void_reason: doc.motivoAnulacion,
        void_date: fechaISO,
        original_transaction_id: originalTransactionId,
        void_transaction_id: voidTransactionId
      }
    },

    // Validaciones de seguridad
    security_checks: {
      document_exists: true, // Se debe verificar
      already_voided: false, // Se debe verificar
      user_has_permissions: true, // Se debe verificar
      within_void_period: true, // Se debe verificar (ej: 30 días)
      valid_reason: doc.motivoAnulacion.trim().length >= 3
    }
  };
}

function categorizarMotivo(motivo: string): string {
  const motivoLower = motivo.toLowerCase();

  if (motivoLower.includes('error') || motivoLower.includes('mistake')) {
    return 'ERROR_INTERNO';
  } else if (motivoLower.includes('cliente') || motivoLower.includes('customer')) {
    return 'SOLICITUD_CLIENTE';
  } else if (motivoLower.includes('duplicado') || motivoLower.includes('duplicate')) {
    return 'DOCUMENTO_DUPLICADO';
  } else if (motivoLower.includes('prueba') || motivoLower.includes('test')) {
    return 'DOCUMENTO_PRUEBA';
  } else {
    return 'OTRO';
  }
}

function calcularImpactoFiscal(tipoDocumento: string): string[] {
  const impactos = [];

  if (tipoDocumento === '01') {
    impactos.push('REVERTIR_IVA');
    impactos.push('REVERTIR_IGTF');
    impactos.push('ACTUALIZAR_LIBRO_VENTAS');
  } else if (tipoDocumento === '02') {
    impactos.push('REVERTIR_CREDITO');
  } else if (tipoDocumento === '03') {
    impactos.push('REVERTIR_DEBITO');
  }

  impactos.push('ACTUALIZAR_ESTADISTICAS');
  return impactos;
}

// Auto-ejecutar análisis
console.log('Analizando JSON de anulación de documentos...\n');
export const voidAnalysisResult = analyzeVoidDocumentRequest();