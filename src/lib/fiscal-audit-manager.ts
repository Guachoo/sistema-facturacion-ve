// =====================================================
// FISCAL AUDIT MANAGER - Sistema de Auditoría Fiscal
// =====================================================
// Gestor completo de auditoría para documentos fiscales
// Cumple con normativas SENIAT de trazabilidad y conservación

import { logger } from './logger';

// =====================================================
// TIPOS DE DATOS DE AUDITORÍA
// =====================================================

export interface FiscalAuditEntry {
  id?: string;
  fiscal_document_id?: string;
  transaction_id: string;
  operacion: FiscalOperation;
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id?: string;
  usuario_nombre?: string;
  usuario_rol?: string;
  ip_address: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  respuesta_seniat?: any;
  codigo_error_seniat?: string;
  exitoso: boolean;
  mensaje_error?: string;
  timestamp?: string;
  checksum?: string;
}

export type FiscalOperation =
  | 'creacion'
  | 'modificacion'
  | 'envio_seniat'
  | 'respuesta_seniat'
  | 'anulacion'
  | 'archivo'
  | 'respaldo'
  | 'consulta_estado'
  | 'descarga'
  | 'reenvio'
  | 'rectificacion'
  | 'consulta';

export interface AuditQuery {
  fiscal_document_id?: string;
  transaction_id?: string;
  operacion?: FiscalOperation[];
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  exitoso?: boolean;
  limite?: number;
  offset?: number;
}

export interface AuditReport {
  periodo: {
    desde: string;
    hasta: string;
  };
  estadisticas: {
    total_operaciones: number;
    operaciones_exitosas: number;
    operaciones_fallidas: number;
    tasa_exito: number;
    documentos_afectados: number;
    usuarios_activos: number;
  };
  operaciones_por_tipo: Record<FiscalOperation, number>;
  usuarios_mas_activos: Array<{
    usuario_nombre: string;
    total_operaciones: number;
    operaciones_exitosas: number;
    tasa_exito: number;
  }>;
  errores_frecuentes: Array<{
    codigo_error: string;
    mensaje_error: string;
    frecuencia: number;
    ultima_ocurrencia: string;
  }>;
  documentos_mas_modificados: Array<{
    transaction_id: string;
    numero_control?: string;
    total_modificaciones: number;
    ultima_modificacion: string;
  }>;
}

// =====================================================
// GESTOR DE AUDITORÍA FISCAL
// =====================================================

export class FiscalAuditManager {
  private static instance: FiscalAuditManager;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = 'https://supfddcbyfuzvxsrzwio.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

    logger.info('fiscal-audit', 'init', 'Fiscal Audit Manager initialized');
  }

  public static getInstance(): FiscalAuditManager {
    if (!FiscalAuditManager.instance) {
      FiscalAuditManager.instance = new FiscalAuditManager();
    }
    return FiscalAuditManager.instance;
  }

  // =====================================================
  // REGISTRO DE EVENTOS DE AUDITORÍA
  // =====================================================

  async registrarEvento(entry: Omit<FiscalAuditEntry, 'id' | 'timestamp' | 'checksum'>): Promise<{
    success: boolean;
    id?: string;
    message: string;
  }> {
    try {
      logger.info('fiscal-audit', 'register_event', 'Registering audit event', {
        operacion: entry.operacion,
        transaction_id: entry.transaction_id,
        exitoso: entry.exitoso
      });

      // Generar checksum para integridad
      const checksum = await this.generateChecksum(entry);

      // Preparar entrada completa
      const completeEntry: FiscalAuditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        checksum,
        request_id: this.generateRequestId()
      };

      // Insertar en base de datos
      const response = await fetch(`${this.supabaseUrl}/rest/v1/fiscal_audit_log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(completeEntry)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al registrar auditoría: ${errorText}`);
      }

      const result = await response.json();
      const auditId = Array.isArray(result) && result.length > 0 ? result[0].id : null;

      logger.info('fiscal-audit', 'register_event', 'Audit event registered successfully', {
        audit_id: auditId,
        operacion: entry.operacion
      });

      return {
        success: true,
        id: auditId,
        message: 'Evento de auditoría registrado exitosamente'
      };

    } catch (error) {
      logger.error('fiscal-audit', 'register_event', 'Error registering audit event', error);

      return {
        success: false,
        message: `Error al registrar auditoría: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // AUDITORÍA DE DOCUMENTOS FISCALES
  // =====================================================

  async auditarCreacionDocumento(
    transactionId: string,
    documentData: any,
    userId: string,
    userInfo: { nombre: string; rol: string; ip: string; userAgent?: string }
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'creacion',
      descripcion: `Documento fiscal creado - Tipo: ${documentData.tipo_documento}, Serie: ${documentData.serie}, Número: ${documentData.numero_documento}`,
      datos_nuevos: documentData,
      usuario_id: userId,
      usuario_nombre: userInfo.nombre,
      usuario_rol: userInfo.rol,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      exitoso: true
    });
  }

  async auditarEnvioSeniat(
    transactionId: string,
    requestData: any,
    responseData: any,
    exitoso: boolean,
    userId: string,
    userInfo: { nombre: string; ip: string }
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'envio_seniat',
      descripcion: exitoso
        ? 'Documento enviado exitosamente a SENIAT'
        : 'Error al enviar documento a SENIAT',
      datos_anteriores: requestData,
      datos_nuevos: responseData,
      respuesta_seniat: responseData,
      codigo_error_seniat: exitoso ? undefined : responseData?.codigo_error,
      usuario_id: userId,
      usuario_nombre: userInfo.nombre,
      ip_address: userInfo.ip,
      exitoso,
      mensaje_error: exitoso ? undefined : responseData?.mensaje || 'Error desconocido en SENIAT'
    });
  }

  async auditarRespuestaSeniat(
    transactionId: string,
    numeroControl: string,
    respuestaSeniat: any,
    exitoso: boolean
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'respuesta_seniat',
      descripcion: `Respuesta de SENIAT procesada - Número de Control: ${numeroControl}`,
      datos_nuevos: respuestaSeniat,
      respuesta_seniat: respuestaSeniat,
      ip_address: '127.0.0.1', // Sistema interno
      exitoso
    });
  }

  async auditarAnulacion(
    transactionId: string,
    motivo: string,
    userId: string,
    userInfo: { nombre: string; rol: string; ip: string }
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'anulacion',
      descripcion: `Documento anulado - Motivo: ${motivo}`,
      datos_nuevos: { motivo_anulacion: motivo, fecha_anulacion: new Date().toISOString() },
      usuario_id: userId,
      usuario_nombre: userInfo.nombre,
      usuario_rol: userInfo.rol,
      ip_address: userInfo.ip,
      exitoso: true
    });
  }

  async auditarConsultaEstado(
    transactionId: string,
    numeroControl: string,
    respuestaConsulta: any,
    exitoso: boolean,
    userId?: string,
    userInfo?: { nombre: string; ip: string }
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'consulta_estado',
      descripcion: `Consulta de estado de documento - Número de Control: ${numeroControl}`,
      datos_nuevos: respuestaConsulta,
      usuario_id: userId,
      usuario_nombre: userInfo?.nombre,
      ip_address: userInfo?.ip || '127.0.0.1',
      exitoso
    });
  }

  async auditarDescarga(
    transactionId: string,
    tipoArchivo: string,
    userId: string,
    userInfo: { nombre: string; ip: string; userAgent?: string }
  ): Promise<void> {
    await this.registrarEvento({
      transaction_id: transactionId,
      operacion: 'descarga',
      descripcion: `Documento descargado - Formato: ${tipoArchivo}`,
      datos_nuevos: { tipo_archivo: tipoArchivo, fecha_descarga: new Date().toISOString() },
      usuario_id: userId,
      usuario_nombre: userInfo.nombre,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      exitoso: true
    });
  }

  // =====================================================
  // CONSULTAS DE AUDITORÍA
  // =====================================================

  async consultarAuditoria(query: AuditQuery): Promise<{
    success: boolean;
    data?: FiscalAuditEntry[];
    total?: number;
    message: string;
  }> {
    try {
      logger.info('fiscal-audit', 'query_audit', 'Querying audit log', query);

      // Construir query de Supabase
      let url = `${this.supabaseUrl}/rest/v1/fiscal_audit_log?select=*`;

      // Agregar filtros
      if (query.fiscal_document_id) {
        url += `&fiscal_document_id=eq.${query.fiscal_document_id}`;
      }

      if (query.transaction_id) {
        url += `&transaction_id=eq.${query.transaction_id}`;
      }

      if (query.operacion && query.operacion.length > 0) {
        url += `&operacion=in.(${query.operacion.join(',')})`;
      }

      if (query.usuario_id) {
        url += `&usuario_id=eq.${query.usuario_id}`;
      }

      if (query.exitoso !== undefined) {
        url += `&exitoso=eq.${query.exitoso}`;
      }

      if (query.fecha_desde) {
        url += `&timestamp=gte.${query.fecha_desde}`;
      }

      if (query.fecha_hasta) {
        url += `&timestamp=lte.${query.fecha_hasta}`;
      }

      // Ordenar por timestamp descendente
      url += '&order=timestamp.desc';

      // Paginación
      if (query.limite) {
        url += `&limit=${query.limite}`;
      }

      if (query.offset) {
        url += `&offset=${query.offset}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en consulta de auditoría: ${errorText}`);
      }

      const data = await response.json();

      logger.info('fiscal-audit', 'query_audit', 'Audit query successful', {
        records_found: data.length
      });

      return {
        success: true,
        data,
        total: data.length,
        message: 'Consulta de auditoría exitosa'
      };

    } catch (error) {
      logger.error('fiscal-audit', 'query_audit', 'Error querying audit log', error);

      return {
        success: false,
        message: `Error en consulta de auditoría: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // REPORTES DE AUDITORÍA
  // =====================================================

  async generarReporteAuditoria(
    fechaDesde: string,
    fechaHasta: string
  ): Promise<{
    success: boolean;
    report?: AuditReport;
    message: string;
  }> {
    try {
      logger.info('fiscal-audit', 'generate_report', 'Generating audit report', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      });

      // Consultar datos del período
      const auditQuery = await this.consultarAuditoria({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        limite: 10000 // Límite alto para reporte completo
      });

      if (!auditQuery.success || !auditQuery.data) {
        throw new Error('Error al obtener datos de auditoría');
      }

      const auditData = auditQuery.data;

      // Calcular estadísticas
      const totalOperaciones = auditData.length;
      const operacionesExitosas = auditData.filter(a => a.exitoso).length;
      const operacionesFallidas = totalOperaciones - operacionesExitosas;
      const tasaExito = totalOperaciones > 0 ? Math.round((operacionesExitosas / totalOperaciones) * 100) : 0;

      // Contar documentos únicos afectados
      const documentosUnicos = new Set(auditData.map(a => a.transaction_id)).size;

      // Contar usuarios únicos activos
      const usuariosUnicos = new Set(auditData.filter(a => a.usuario_id).map(a => a.usuario_id)).size;

      // Operaciones por tipo
      const operacionesPorTipo: Record<FiscalOperation, number> = {
        creacion: 0,
        modificacion: 0,
        envio_seniat: 0,
        respuesta_seniat: 0,
        anulacion: 0,
        archivo: 0,
        respaldo: 0,
        consulta_estado: 0,
        descarga: 0,
        reenvio: 0,
        rectificacion: 0,
        consulta: 0
      };

      auditData.forEach(audit => {
        if (audit.operacion in operacionesPorTipo) {
          operacionesPorTipo[audit.operacion]++;
        }
      });

      // Usuarios más activos
      const usuariosActividad = new Map<string, { nombre: string; total: number; exitosas: number }>();

      auditData.forEach(audit => {
        if (audit.usuario_nombre) {
          const existing = usuariosActividad.get(audit.usuario_nombre) || {
            nombre: audit.usuario_nombre,
            total: 0,
            exitosas: 0
          };

          existing.total++;
          if (audit.exitoso) existing.exitosas++;

          usuariosActividad.set(audit.usuario_nombre, existing);
        }
      });

      const usuariosMasActivos = Array.from(usuariosActividad.values())
        .map(u => ({
          usuario_nombre: u.nombre,
          total_operaciones: u.total,
          operaciones_exitosas: u.exitosas,
          tasa_exito: u.total > 0 ? Math.round((u.exitosas / u.total) * 100) : 0
        }))
        .sort((a, b) => b.total_operaciones - a.total_operaciones)
        .slice(0, 10);

      // Errores frecuentes
      const erroresMap = new Map<string, { mensaje: string; frecuencia: number; ultimaOcurrencia: string }>();

      auditData
        .filter(a => !a.exitoso && a.codigo_error_seniat)
        .forEach(audit => {
          const codigo = audit.codigo_error_seniat!;
          const existing = erroresMap.get(codigo) || {
            mensaje: audit.mensaje_error || 'Error desconocido',
            frecuencia: 0,
            ultimaOcurrencia: audit.timestamp || ''
          };

          existing.frecuencia++;
          if (!audit.timestamp || audit.timestamp > existing.ultimaOcurrencia) {
            existing.ultimaOcurrencia = audit.timestamp || '';
          }

          erroresMap.set(codigo, existing);
        });

      const erroresFrecuentes = Array.from(erroresMap.entries())
        .map(([codigo, data]) => ({
          codigo_error: codigo,
          mensaje_error: data.mensaje,
          frecuencia: data.frecuencia,
          ultima_ocurrencia: data.ultimaOcurrencia
        }))
        .sort((a, b) => b.frecuencia - a.frecuencia)
        .slice(0, 10);

      // Documentos más modificados
      const documentosModificaciones = new Map<string, { numeroControl?: string; total: number; ultima: string }>();

      auditData
        .filter(a => a.operacion === 'modificacion')
        .forEach(audit => {
          const existing = documentosModificaciones.get(audit.transaction_id) || {
            total: 0,
            ultima: audit.timestamp || ''
          };

          existing.total++;
          if (!audit.timestamp || audit.timestamp > existing.ultima) {
            existing.ultima = audit.timestamp || '';
          }

          documentosModificaciones.set(audit.transaction_id, existing);
        });

      const documentosMasModificados = Array.from(documentosModificaciones.entries())
        .map(([transactionId, data]) => ({
          transaction_id: transactionId,
          numero_control: data.numeroControl,
          total_modificaciones: data.total,
          ultima_modificacion: data.ultima
        }))
        .sort((a, b) => b.total_modificaciones - a.total_modificaciones)
        .slice(0, 10);

      // Construir reporte completo
      const report: AuditReport = {
        periodo: {
          desde: fechaDesde,
          hasta: fechaHasta
        },
        estadisticas: {
          total_operaciones: totalOperaciones,
          operaciones_exitosas: operacionesExitosas,
          operaciones_fallidas: operacionesFallidas,
          tasa_exito: tasaExito,
          documentos_afectados: documentosUnicos,
          usuarios_activos: usuariosUnicos
        },
        operaciones_por_tipo: operacionesPorTipo,
        usuarios_mas_activos: usuariosMasActivos,
        errores_frecuentes: erroresFrecuentes,
        documentos_mas_modificados: documentosMasModificados
      };

      logger.info('fiscal-audit', 'generate_report', 'Audit report generated successfully', {
        total_operaciones: totalOperaciones,
        tasa_exito: tasaExito
      });

      return {
        success: true,
        report,
        message: 'Reporte de auditoría generado exitosamente'
      };

    } catch (error) {
      logger.error('fiscal-audit', 'generate_report', 'Error generating audit report', error);

      return {
        success: false,
        message: `Error al generar reporte de auditoría: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  private async generateChecksum(entry: Omit<FiscalAuditEntry, 'id' | 'timestamp' | 'checksum'>): Promise<string> {
    const dataString = JSON.stringify({
      transaction_id: entry.transaction_id,
      operacion: entry.operacion,
      datos_anteriores: entry.datos_anteriores,
      datos_nuevos: entry.datos_nuevos,
      usuario_id: entry.usuario_id,
      ip_address: entry.ip_address
    });

    // Simple hash function para checksum
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  private generateRequestId(): string {
    return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Verificar integridad de entrada de auditoría
  async verificarIntegridad(auditId: string): Promise<{
    valido: boolean;
    mensaje: string;
  }> {
    try {
      // Obtener entrada de auditoría
      const response = await fetch(`${this.supabaseUrl}/rest/v1/fiscal_audit_log?id=eq.${auditId}`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      const data = await response.json();
      if (!data || data.length === 0) {
        return { valido: false, mensaje: 'Entrada de auditoría no encontrada' };
      }

      const entry = data[0];

      // Recalcular checksum
      const checksumCalculado = await this.generateChecksum(entry);

      const valido = checksumCalculado === entry.checksum;

      return {
        valido,
        mensaje: valido ? 'Integridad verificada' : 'Integridad comprometida - checksum no coincide'
      };

    } catch (error) {
      return {
        valido: false,
        mensaje: `Error al verificar integridad: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
}

// Instancia singleton
export const fiscalAuditManager = FiscalAuditManager.getInstance();

export default fiscalAuditManager;