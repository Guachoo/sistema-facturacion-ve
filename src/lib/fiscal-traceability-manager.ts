// =====================================================
// FISCAL TRACEABILITY MANAGER - Sistema de Trazabilidad Fiscal
// =====================================================
// Sistema completo de trazabilidad para documentos fiscales
// Rastrea cada paso del proceso desde creación hasta archivado

import { logger } from './logger';

// =====================================================
// TIPOS DE DATOS DE TRAZABILIDAD
// =====================================================

export interface FiscalTraceStep {
  id?: string;
  fiscal_document_id: string;
  transaction_id: string;
  paso_numero: number;
  paso_nombre: string;
  paso_descripcion?: string;
  estado_paso: TraceStepStatus;
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_ms?: number;
  datos_entrada?: any;
  datos_salida?: any;
  parametros?: any;
  codigo_error?: string;
  mensaje_error?: string;
  stack_trace?: string;
  usuario_id?: string;
  sistema_origen: string;
  version_sistema?: string;
  request_seniat?: any;
  response_seniat?: any;
  seniat_request_id?: string;
  creado_en?: string;
}

export type TraceStepStatus = 'pendiente' | 'en_proceso' | 'completado' | 'fallido' | 'omitido';

export interface FiscalWorkflow {
  id: string;
  nombre: string;
  descripcion: string;
  tipo_documento: string;
  pasos: WorkflowStep[];
  activo: boolean;
}

export interface WorkflowStep {
  numero: number;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  timeout_ms?: number;
  reintentos_max?: number;
  dependencias?: number[]; // Números de pasos que deben completarse antes
}

export interface TraceabilityReport {
  documento: {
    transaction_id: string;
    numero_control?: string;
    tipo_documento: string;
    estado_actual: string;
  };
  resumen: {
    total_pasos: number;
    pasos_completados: number;
    pasos_fallidos: number;
    pasos_pendientes: number;
    tiempo_total_ms: number;
    eficiencia: number; // porcentaje
  };
  linea_tiempo: Array<{
    paso_numero: number;
    paso_nombre: string;
    estado: TraceStepStatus;
    fecha_inicio: string;
    fecha_fin?: string;
    duracion_ms?: number;
    observaciones?: string;
  }>;
  errores: Array<{
    paso_numero: number;
    codigo_error: string;
    mensaje_error: string;
    fecha: string;
  }>;
  metricas_seniat: {
    requests_enviados: number;
    responses_recibidos: number;
    tiempo_respuesta_promedio_ms: number;
    errores_seniat: number;
  };
}

export interface TraceabilityMetrics {
  documentos_rastreados: number;
  eficiencia_promedio: number;
  tiempo_procesamiento_promedio_ms: number;
  pasos_mas_lentos: Array<{
    paso_nombre: string;
    tiempo_promedio_ms: number;
    frecuencia_errores: number;
  }>;
  errores_frecuentes: Array<{
    codigo_error: string;
    mensaje: string;
    frecuencia: number;
    paso_mas_afectado: string;
  }>;
}

// =====================================================
// DEFINICIÓN DE WORKFLOWS ESTÁNDAR
// =====================================================

const FISCAL_WORKFLOWS: FiscalWorkflow[] = [
  {
    id: 'factura_completa',
    nombre: 'Proceso de Factura Completa',
    descripcion: 'Workflow completo para emisión de factura fiscal',
    tipo_documento: '01',
    activo: true,
    pasos: [
      { numero: 1, nombre: 'validacion_datos', descripcion: 'Validación de datos fiscales', obligatorio: true, timeout_ms: 5000 },
      { numero: 2, nombre: 'generacion_json', descripcion: 'Generación de JSON fiscal', obligatorio: true, timeout_ms: 10000, dependencias: [1] },
      { numero: 3, nombre: 'calculo_impuestos', descripcion: 'Cálculo de IVA e IGTF', obligatorio: true, timeout_ms: 5000, dependencias: [2] },
      { numero: 4, nombre: 'asignacion_numeracion', descripcion: 'Asignación de numeración fiscal', obligatorio: true, timeout_ms: 3000, dependencias: [3] },
      { numero: 5, nombre: 'almacenamiento_local', descripcion: 'Almacenamiento en base de datos local', obligatorio: true, timeout_ms: 5000, dependencias: [4] },
      { numero: 6, nombre: 'envio_seniat', descripcion: 'Envío a SENIAT TFHKA', obligatorio: true, timeout_ms: 30000, reintentos_max: 3, dependencias: [5] },
      { numero: 7, nombre: 'procesamiento_seniat', descripcion: 'Procesamiento por SENIAT', obligatorio: true, timeout_ms: 60000, dependencias: [6] },
      { numero: 8, nombre: 'recepcion_numero_control', descripcion: 'Recepción de número de control', obligatorio: true, timeout_ms: 10000, dependencias: [7] },
      { numero: 9, nombre: 'generacion_qr', descripcion: 'Generación de código QR', obligatorio: false, timeout_ms: 5000, dependencias: [8] },
      { numero: 10, nombre: 'generacion_pdf', descripcion: 'Generación de PDF fiscal', obligatorio: false, timeout_ms: 15000, dependencias: [8] },
      { numero: 11, nombre: 'notificacion_cliente', descripcion: 'Notificación al cliente', obligatorio: false, timeout_ms: 10000, dependencias: [10] },
      { numero: 12, nombre: 'archivo_documento', descripcion: 'Archivo del documento', obligatorio: true, timeout_ms: 5000, dependencias: [8] }
    ]
  },
  {
    id: 'nota_credito',
    nombre: 'Proceso de Nota de Crédito',
    descripcion: 'Workflow para emisión de nota de crédito',
    tipo_documento: '03',
    activo: true,
    pasos: [
      { numero: 1, nombre: 'validacion_factura_origen', descripcion: 'Validación de factura origen', obligatorio: true, timeout_ms: 5000 },
      { numero: 2, nombre: 'validacion_monto', descripcion: 'Validación de monto a acreditar', obligatorio: true, timeout_ms: 3000, dependencias: [1] },
      { numero: 3, nombre: 'generacion_json', descripcion: 'Generación de JSON fiscal', obligatorio: true, timeout_ms: 10000, dependencias: [2] },
      { numero: 4, nombre: 'envio_seniat', descripcion: 'Envío a SENIAT TFHKA', obligatorio: true, timeout_ms: 30000, reintentos_max: 3, dependencias: [3] },
      { numero: 5, nombre: 'procesamiento_seniat', descripcion: 'Procesamiento por SENIAT', obligatorio: true, timeout_ms: 60000, dependencias: [4] },
      { numero: 6, nombre: 'actualizacion_factura_origen', descripcion: 'Actualización de factura origen', obligatorio: true, timeout_ms: 5000, dependencias: [5] }
    ]
  },
  {
    id: 'anulacion',
    nombre: 'Proceso de Anulación',
    descripcion: 'Workflow para anulación de documentos fiscales',
    tipo_documento: '04',
    activo: true,
    pasos: [
      { numero: 1, nombre: 'validacion_documento_origen', descripcion: 'Validación de documento a anular', obligatorio: true, timeout_ms: 5000 },
      { numero: 2, nombre: 'validacion_permisos', descripcion: 'Validación de permisos de usuario', obligatorio: true, timeout_ms: 3000, dependencias: [1] },
      { numero: 3, nombre: 'generacion_anulacion', descripcion: 'Generación de documento de anulación', obligatorio: true, timeout_ms: 10000, dependencias: [2] },
      { numero: 4, nombre: 'envio_seniat', descripcion: 'Envío de anulación a SENIAT', obligatorio: true, timeout_ms: 30000, reintentos_max: 3, dependencias: [3] },
      { numero: 5, nombre: 'confirmacion_anulacion', descripcion: 'Confirmación de anulación por SENIAT', obligatorio: true, timeout_ms: 60000, dependencias: [4] },
      { numero: 6, nombre: 'actualizacion_estado', descripcion: 'Actualización de estado del documento', obligatorio: true, timeout_ms: 5000, dependencias: [5] }
    ]
  }
];

// =====================================================
// GESTOR DE TRAZABILIDAD FISCAL
// =====================================================

export class FiscalTraceabilityManager {
  private static instance: FiscalTraceabilityManager;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = 'https://supfddcbyfuzvxsrzwio.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

    logger.info('fiscal-trace', 'init', 'Fiscal Traceability Manager initialized');
  }

  public static getInstance(): FiscalTraceabilityManager {
    if (!FiscalTraceabilityManager.instance) {
      FiscalTraceabilityManager.instance = new FiscalTraceabilityManager();
    }
    return FiscalTraceabilityManager.instance;
  }

  // =====================================================
  // INICIO Y GESTIÓN DE TRAZABILIDAD
  // =====================================================

  async iniciarTrazabilidad(
    fiscalDocumentId: string,
    transactionId: string,
    tipoDocumento: string,
    sistemaOrigen: string = 'web_app',
    usuarioId?: string
  ): Promise<{
    success: boolean;
    workflow_id?: string;
    total_pasos?: number;
    message: string;
  }> {
    try {
      logger.info('fiscal-trace', 'start', 'Starting fiscal traceability', {
        fiscal_document_id: fiscalDocumentId,
        transaction_id: transactionId,
        tipo_documento: tipoDocumento
      });

      // Encontrar workflow apropiado
      const workflow = FISCAL_WORKFLOWS.find(w => w.tipo_documento === tipoDocumento && w.activo);

      if (!workflow) {
        throw new Error(`No se encontró workflow para tipo de documento: ${tipoDocumento}`);
      }

      // Crear pasos iniciales del workflow
      const pasosIniciales: Omit<FiscalTraceStep, 'id'>[] = workflow.pasos.map(paso => ({
        fiscal_document_id: fiscalDocumentId,
        transaction_id: transactionId,
        paso_numero: paso.numero,
        paso_nombre: paso.nombre,
        paso_descripcion: paso.descripcion,
        estado_paso: 'pendiente',
        fecha_inicio: new Date().toISOString(),
        usuario_id: usuarioId,
        sistema_origen: sistemaOrigen,
        version_sistema: '1.0.0'
      }));

      // Insertar pasos en base de datos
      for (const paso of pasosIniciales) {
        await this.insertarPasoTrazabilidad(paso);
      }

      logger.info('fiscal-trace', 'start', 'Traceability workflow initialized', {
        workflow_id: workflow.id,
        total_pasos: workflow.pasos.length
      });

      return {
        success: true,
        workflow_id: workflow.id,
        total_pasos: workflow.pasos.length,
        message: `Trazabilidad iniciada con workflow: ${workflow.nombre}`
      };

    } catch (error) {
      logger.error('fiscal-trace', 'start', 'Error starting traceability', error);

      return {
        success: false,
        message: `Error al iniciar trazabilidad: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // REGISTRO DE PASOS
  // =====================================================

  async registrarPaso(
    transactionId: string,
    numeroPaso: number,
    estado: TraceStepStatus,
    opciones?: {
      datos_entrada?: any;
      datos_salida?: any;
      parametros?: any;
      error?: { codigo: string; mensaje: string; stack?: string };
      seniat_data?: { request?: any; response?: any; request_id?: string };
      duracion_ms?: number;
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.debug('fiscal-trace', 'register_step', 'Registering trace step', {
        transaction_id: transactionId,
        paso_numero: numeroPaso,
        estado
      });

      // Buscar el paso existente
      const pasoExistente = await this.obtenerPaso(transactionId, numeroPaso);

      if (!pasoExistente) {
        throw new Error(`Paso ${numeroPaso} no encontrado para transacción ${transactionId}`);
      }

      // Preparar actualizaciones
      const updates: Partial<FiscalTraceStep> = {
        estado_paso: estado
      };

      // Si el paso está comenzando
      if (estado === 'en_proceso' && pasoExistente.estado_paso === 'pendiente') {
        updates.fecha_inicio = new Date().toISOString();
      }

      // Si el paso está terminando (completado o fallido)
      if ((estado === 'completado' || estado === 'fallido') && !pasoExistente.fecha_fin) {
        const fechaFin = new Date().toISOString();
        updates.fecha_fin = fechaFin;

        // Calcular duración si no se proporciona
        if (!opciones?.duracion_ms && pasoExistente.fecha_inicio) {
          const inicio = new Date(pasoExistente.fecha_inicio);
          const fin = new Date(fechaFin);
          updates.duracion_ms = fin.getTime() - inicio.getTime();
        } else if (opciones?.duracion_ms) {
          updates.duracion_ms = opciones.duracion_ms;
        }
      }

      // Agregar datos opcionales
      if (opciones?.datos_entrada) updates.datos_entrada = opciones.datos_entrada;
      if (opciones?.datos_salida) updates.datos_salida = opciones.datos_salida;
      if (opciones?.parametros) updates.parametros = opciones.parametros;

      // Agregar información de error
      if (opciones?.error) {
        updates.codigo_error = opciones.error.codigo;
        updates.mensaje_error = opciones.error.mensaje;
        updates.stack_trace = opciones.error.stack;
      }

      // Agregar datos de SENIAT
      if (opciones?.seniat_data) {
        updates.request_seniat = opciones.seniat_data.request;
        updates.response_seniat = opciones.seniat_data.response;
        updates.seniat_request_id = opciones.seniat_data.request_id;
      }

      // Actualizar paso en base de datos
      await this.actualizarPaso(pasoExistente.id!, updates);

      // Si el paso falló y tiene reintentos, programar reintento
      if (estado === 'fallido') {
        await this.manejarPasoFallido(transactionId, numeroPaso);
      }

      // Si el paso se completó, verificar dependencias para siguiente paso
      if (estado === 'completado') {
        await this.verificarDependenciasYActivarSiguientes(transactionId);
      }

      logger.debug('fiscal-trace', 'register_step', 'Trace step registered successfully', {
        transaction_id: transactionId,
        paso_numero: numeroPaso,
        estado
      });

      return {
        success: true,
        message: 'Paso de trazabilidad registrado exitosamente'
      };

    } catch (error) {
      logger.error('fiscal-trace', 'register_step', 'Error registering trace step', error);

      return {
        success: false,
        message: `Error al registrar paso: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // CONSULTAS Y REPORTES
  // =====================================================

  async obtenerTrazabilidadCompleta(transactionId: string): Promise<{
    success: boolean;
    report?: TraceabilityReport;
    message: string;
  }> {
    try {
      logger.info('fiscal-trace', 'get_trace', 'Getting complete traceability', { transaction_id: transactionId });

      // Obtener información del documento
      const documento = await this.obtenerInformacionDocumento(transactionId);
      if (!documento) {
        throw new Error('Documento fiscal no encontrado');
      }

      // Obtener todos los pasos de trazabilidad
      const pasos = await this.obtenerPasosPorTransaccion(transactionId);

      // Calcular resumen
      const totalPasos = pasos.length;
      const pasosCompletados = pasos.filter(p => p.estado_paso === 'completado').length;
      const pasosFallidos = pasos.filter(p => p.estado_paso === 'fallido').length;
      const pasosPendientes = pasos.filter(p => p.estado_paso === 'pendiente').length;

      const tiempoTotalMs = pasos.reduce((total, paso) => {
        return total + (paso.duracion_ms || 0);
      }, 0);

      const eficiencia = totalPasos > 0 ? Math.round((pasosCompletados / totalPasos) * 100) : 0;

      // Crear línea de tiempo
      const lineaTiempo = pasos
        .sort((a, b) => a.paso_numero - b.paso_numero)
        .map(paso => ({
          paso_numero: paso.paso_numero,
          paso_nombre: paso.paso_nombre,
          estado: paso.estado_paso,
          fecha_inicio: paso.fecha_inicio,
          fecha_fin: paso.fecha_fin,
          duracion_ms: paso.duracion_ms,
          observaciones: paso.mensaje_error || undefined
        }));

      // Extraer errores
      const errores = pasos
        .filter(p => p.codigo_error)
        .map(paso => ({
          paso_numero: paso.paso_numero,
          codigo_error: paso.codigo_error!,
          mensaje_error: paso.mensaje_error || 'Error desconocido',
          fecha: paso.fecha_fin || paso.fecha_inicio
        }));

      // Calcular métricas SENIAT
      const pasosSeniat = pasos.filter(p => p.request_seniat || p.response_seniat);
      const requestsEnviados = pasos.filter(p => p.request_seniat).length;
      const responsesRecibidos = pasos.filter(p => p.response_seniat).length;

      const tiemposRespuestaSeniat = pasosSeniat
        .filter(p => p.duracion_ms)
        .map(p => p.duracion_ms!);

      const tiempoRespuestaPromedio = tiemposRespuestaSeniat.length > 0
        ? Math.round(tiemposRespuestaSeniat.reduce((a, b) => a + b, 0) / tiemposRespuestaSeniat.length)
        : 0;

      const erroresSeniat = pasos.filter(p => p.codigo_error && (p.request_seniat || p.response_seniat)).length;

      const report: TraceabilityReport = {
        documento: {
          transaction_id: transactionId,
          numero_control: documento.numero_control,
          tipo_documento: documento.tipo_documento,
          estado_actual: documento.estado_documento
        },
        resumen: {
          total_pasos: totalPasos,
          pasos_completados: pasosCompletados,
          pasos_fallidos: pasosFallidos,
          pasos_pendientes: pasosPendientes,
          tiempo_total_ms: tiempoTotalMs,
          eficiencia
        },
        linea_tiempo: lineaTiempo,
        errores,
        metricas_seniat: {
          requests_enviados: requestsEnviados,
          responses_recibidos: responsesRecibidos,
          tiempo_respuesta_promedio_ms: tiempoRespuestaPromedio,
          errores_seniat: erroresSeniat
        }
      };

      logger.info('fiscal-trace', 'get_trace', 'Traceability report generated', {
        transaction_id: transactionId,
        eficiencia,
        total_pasos: totalPasos
      });

      return {
        success: true,
        report,
        message: 'Reporte de trazabilidad generado exitosamente'
      };

    } catch (error) {
      logger.error('fiscal-trace', 'get_trace', 'Error getting traceability', error);

      return {
        success: false,
        message: `Error al obtener trazabilidad: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  async generarMetricasTrazabilidad(
    fechaDesde: string,
    fechaHasta: string
  ): Promise<{
    success: boolean;
    metrics?: TraceabilityMetrics;
    message: string;
  }> {
    try {
      logger.info('fiscal-trace', 'metrics', 'Generating traceability metrics', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      });

      // Obtener todos los pasos del período
      const pasos = await this.obtenerPasosPorPeriodo(fechaDesde, fechaHasta);

      // Contar documentos únicos rastreados
      const documentosUnicos = new Set(pasos.map(p => p.transaction_id)).size;

      // Calcular eficiencia promedio
      const documentos = new Map<string, { completados: number; total: number }>();

      pasos.forEach(paso => {
        const doc = documentos.get(paso.transaction_id) || { completados: 0, total: 0 };
        doc.total++;
        if (paso.estado_paso === 'completado') doc.completados++;
        documentos.set(paso.transaction_id, doc);
      });

      const eficiencias = Array.from(documentos.values())
        .map(doc => doc.total > 0 ? (doc.completados / doc.total) * 100 : 0);

      const eficienciaPromedio = eficiencias.length > 0
        ? Math.round(eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length)
        : 0;

      // Calcular tiempo de procesamiento promedio
      const tiempos = pasos
        .filter(p => p.duracion_ms)
        .map(p => p.duracion_ms!);

      const tiempoPromedioMs = tiempos.length > 0
        ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
        : 0;

      // Identificar pasos más lentos
      const pasosTiempos = new Map<string, { tiempos: number[]; errores: number }>();

      pasos.forEach(paso => {
        const data = pasosTiempos.get(paso.paso_nombre) || { tiempos: [], errores: 0 };
        if (paso.duracion_ms) data.tiempos.push(paso.duracion_ms);
        if (paso.estado_paso === 'fallido') data.errores++;
        pasosTiempos.set(paso.paso_nombre, data);
      });

      const pasosMasLentos = Array.from(pasosTiempos.entries())
        .map(([nombre, data]) => ({
          paso_nombre: nombre,
          tiempo_promedio_ms: data.tiempos.length > 0
            ? Math.round(data.tiempos.reduce((a, b) => a + b, 0) / data.tiempos.length)
            : 0,
          frecuencia_errores: data.errores
        }))
        .sort((a, b) => b.tiempo_promedio_ms - a.tiempo_promedio_ms)
        .slice(0, 10);

      // Identificar errores frecuentes
      const erroresMap = new Map<string, { mensaje: string; frecuencia: number; pasos: Set<string> }>();

      pasos
        .filter(p => p.codigo_error)
        .forEach(paso => {
          const codigo = paso.codigo_error!;
          const data = erroresMap.get(codigo) || {
            mensaje: paso.mensaje_error || 'Error desconocido',
            frecuencia: 0,
            pasos: new Set()
          };

          data.frecuencia++;
          data.pasos.add(paso.paso_nombre);
          erroresMap.set(codigo, data);
        });

      const erroresFrecuentes = Array.from(erroresMap.entries())
        .map(([codigo, data]) => ({
          codigo_error: codigo,
          mensaje: data.mensaje,
          frecuencia: data.frecuencia,
          paso_mas_afectado: Array.from(data.pasos)[0] // Primer paso afectado
        }))
        .sort((a, b) => b.frecuencia - a.frecuencia)
        .slice(0, 10);

      const metrics: TraceabilityMetrics = {
        documentos_rastreados: documentosUnicos,
        eficiencia_promedio: eficienciaPromedio,
        tiempo_procesamiento_promedio_ms: tiempoPromedioMs,
        pasos_mas_lentos: pasosMasLentos,
        errores_frecuentes: erroresFrecuentes
      };

      logger.info('fiscal-trace', 'metrics', 'Traceability metrics generated', {
        documentos_rastreados: documentosUnicos,
        eficiencia_promedio: eficienciaPromedio
      });

      return {
        success: true,
        metrics,
        message: 'Métricas de trazabilidad generadas exitosamente'
      };

    } catch (error) {
      logger.error('fiscal-trace', 'metrics', 'Error generating metrics', error);

      return {
        success: false,
        message: `Error al generar métricas: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // MÉTODOS AUXILIARES PRIVADOS
  // =====================================================

  private async insertarPasoTrazabilidad(paso: Omit<FiscalTraceStep, 'id'>): Promise<string | null> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/fiscal_traceability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(paso)
    });

    const result = await response.json();
    return Array.isArray(result) && result.length > 0 ? result[0].id : null;
  }

  private async obtenerPaso(transactionId: string, numeroPaso: number): Promise<FiscalTraceStep | null> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/fiscal_traceability?transaction_id=eq.${transactionId}&paso_numero=eq.${numeroPaso}`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      }
    );

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  }

  private async actualizarPaso(pasoId: string, updates: Partial<FiscalTraceStep>): Promise<void> {
    await fetch(`${this.supabaseUrl}/rest/v1/fiscal_traceability?id=eq.${pasoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`
      },
      body: JSON.stringify(updates)
    });
  }

  private async obtenerInformacionDocumento(transactionId: string): Promise<any> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/fiscal_documents?transaction_id=eq.${transactionId}&select=numero_control,tipo_documento,estado_documento`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      }
    );

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  }

  private async obtenerPasosPorTransaccion(transactionId: string): Promise<FiscalTraceStep[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/fiscal_traceability?transaction_id=eq.${transactionId}&order=paso_numero.asc`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      }
    );

    return await response.json();
  }

  private async obtenerPasosPorPeriodo(fechaDesde: string, fechaHasta: string): Promise<FiscalTraceStep[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/fiscal_traceability?fecha_inicio=gte.${fechaDesde}&fecha_inicio=lte.${fechaHasta}`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      }
    );

    return await response.json();
  }

  private async manejarPasoFallido(transactionId: string, numeroPaso: number): Promise<void> {
    // En implementación real, aquí se manejarían los reintentos automáticos
    // basados en la configuración del workflow
    logger.warn('fiscal-trace', 'step_failed', 'Step failed', {
      transaction_id: transactionId,
      paso_numero: numeroPaso
    });
  }

  private async verificarDependenciasYActivarSiguientes(transactionId: string): Promise<void> {
    // En implementación real, aquí se verificarían las dependencias
    // y se activarían los siguientes pasos que estén listos para ejecutarse
    logger.debug('fiscal-trace', 'check_dependencies', 'Checking dependencies for next steps', {
      transaction_id: transactionId
    });
  }
}

// Instancia singleton
export const fiscalTraceabilityManager = FiscalTraceabilityManager.getInstance();

export default fiscalTraceabilityManager;