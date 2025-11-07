// =====================================================
// FISCAL PERSISTENCE HOOKS - React Hooks para Persistencia Fiscal
// =====================================================
// Hooks para facilitar el uso del sistema de persistencia fiscal

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fiscalAuditManager } from '@/lib/fiscal-audit-manager';
import { fiscalBackupManager } from '@/lib/fiscal-backup-manager';
import { fiscalTraceabilityManager } from '@/lib/fiscal-traceability-manager';
import { logger } from '@/lib/logger';
import type {
  FiscalAuditEntry,
  AuditQuery,
  AuditReport,
  FiscalOperation
} from '@/lib/fiscal-audit-manager';
import type {
  FiscalBackup,
  BackupType,
  BackupConfiguration,
  BackupStatistics
} from '@/lib/fiscal-backup-manager';
import type {
  FiscalTraceStep,
  TraceStepStatus,
  TraceabilityReport,
  TraceabilityMetrics
} from '@/lib/fiscal-traceability-manager';

// =====================================================
// HOOKS DE AUDITORÍA FISCAL
// =====================================================

export const useFiscalAuditEntry = () => {
  return useMutation({
    mutationFn: async (entry: Omit<FiscalAuditEntry, 'id' | 'timestamp' | 'checksum'>) => {
      logger.info('fiscal-hooks', 'audit_entry', 'Creating audit entry', {
        operacion: entry.operacion,
        transaction_id: entry.transaction_id
      });

      const result = await fiscalAuditManager.registrarEvento(entry);

      if (result.success) {
        logger.info('fiscal-hooks', 'audit_entry', 'Audit entry created successfully', {
          audit_id: result.id
        });
      } else {
        logger.error('fiscal-hooks', 'audit_entry', 'Failed to create audit entry', result.message);
      }

      return result;
    },
    onError: (error) => {
      logger.error('fiscal-hooks', 'audit_entry', 'Audit entry mutation error', error);
    }
  });
};

export const useFiscalAuditQuery = (
  query: AuditQuery,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: ['fiscal-audit', query],
    queryFn: async () => {
      logger.info('fiscal-hooks', 'audit_query', 'Querying audit log', query);

      const result = await fiscalAuditManager.consultarAuditoria(query);

      if (result.success) {
        logger.info('fiscal-hooks', 'audit_query', 'Audit query successful', {
          records_found: result.data?.length || 0
        });
      } else {
        logger.error('fiscal-hooks', 'audit_query', 'Audit query failed', result.message);
        throw new Error(result.message);
      }

      return result;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 segundos
    retry: 2
  });
};

export const useFiscalAuditReport = () => {
  return useMutation({
    mutationFn: async ({ fechaDesde, fechaHasta }: { fechaDesde: string; fechaHasta: string }) => {
      logger.info('fiscal-hooks', 'audit_report', 'Generating audit report', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      });

      const result = await fiscalAuditManager.generarReporteAuditoria(fechaDesde, fechaHasta);

      if (result.success) {
        logger.info('fiscal-hooks', 'audit_report', 'Audit report generated successfully');
      } else {
        logger.error('fiscal-hooks', 'audit_report', 'Failed to generate audit report', result.message);
      }

      return result;
    }
  });
};

// Hook para auditoría automática de operaciones
export const useFiscalAuditTracker = () => {
  const auditEntry = useFiscalAuditEntry();

  const trackOperation = async (
    transactionId: string,
    operacion: FiscalOperation,
    descripcion: string,
    exitoso: boolean,
    userInfo: {
      id?: string;
      nombre?: string;
      rol?: string;
      ip: string;
      userAgent?: string;
    },
    additionalData?: {
      datos_anteriores?: any;
      datos_nuevos?: any;
      respuesta_seniat?: any;
      codigo_error_seniat?: string;
      mensaje_error?: string;
    }
  ) => {
    await auditEntry.mutateAsync({
      transaction_id: transactionId,
      operacion,
      descripcion,
      datos_anteriores: additionalData?.datos_anteriores,
      datos_nuevos: additionalData?.datos_nuevos,
      usuario_id: userInfo.id,
      usuario_nombre: userInfo.nombre,
      usuario_rol: userInfo.rol,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      respuesta_seniat: additionalData?.respuesta_seniat,
      codigo_error_seniat: additionalData?.codigo_error_seniat,
      exitoso,
      mensaje_error: additionalData?.mensaje_error
    });
  };

  return {
    trackOperation,
    isTracking: auditEntry.isPending
  };
};

// =====================================================
// HOOKS DE BACKUP FISCAL
// =====================================================

export const useFiscalBackupExecution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tipo,
      fechaDesde,
      fechaHasta,
      iniciadoPor
    }: {
      tipo: BackupType;
      fechaDesde?: string;
      fechaHasta?: string;
      iniciadoPor?: string;
    }) => {
      logger.info('fiscal-hooks', 'backup_execute', 'Executing fiscal backup', {
        tipo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      });

      const result = await fiscalBackupManager.ejecutarBackup(tipo, fechaDesde, fechaHasta, iniciadoPor);

      if (result.success) {
        logger.info('fiscal-hooks', 'backup_execute', 'Backup executed successfully', {
          backup_id: result.backup?.id
        });
      } else {
        logger.error('fiscal-hooks', 'backup_execute', 'Backup execution failed', result.message);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ['fiscal-backups'] });
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] });
    },
    onError: (error) => {
      logger.error('fiscal-hooks', 'backup_execute', 'Backup execution mutation error', error);
    }
  });
};

export const useFiscalBackupConfiguration = () => {
  const queryClient = useQueryClient();

  const getConfiguration = useQuery({
    queryKey: ['backup-configuration'],
    queryFn: async () => {
      logger.info('fiscal-hooks', 'backup_config', 'Loading backup configuration');

      const config = await fiscalBackupManager.cargarConfiguracion();

      logger.info('fiscal-hooks', 'backup_config', 'Backup configuration loaded', {
        automatico_habilitado: config.automatico_habilitado
      });

      return config;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const updateConfiguration = useMutation({
    mutationFn: async (newConfig: Partial<BackupConfiguration>) => {
      logger.info('fiscal-hooks', 'backup_config_update', 'Updating backup configuration', newConfig);

      const result = await fiscalBackupManager.actualizarConfiguracion(newConfig);

      if (result.success) {
        logger.info('fiscal-hooks', 'backup_config_update', 'Backup configuration updated successfully');
      } else {
        logger.error('fiscal-hooks', 'backup_config_update', 'Failed to update backup configuration', result.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-configuration'] });
    }
  });

  return {
    configuration: getConfiguration.data,
    isLoading: getConfiguration.isLoading,
    updateConfiguration,
    isUpdating: updateConfiguration.isPending
  };
};

export const useFiscalBackupStatistics = () => {
  return useQuery({
    queryKey: ['backup-statistics'],
    queryFn: async () => {
      logger.info('fiscal-hooks', 'backup_stats', 'Loading backup statistics');

      const stats = await fiscalBackupManager.obtenerEstadisticasBackup();

      logger.info('fiscal-hooks', 'backup_stats', 'Backup statistics loaded', {
        total_backups: stats.total_backups,
        tasa_exito: stats.tasa_exito
      });

      return stats;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

export const useFiscalBackupVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ backupId, verificadoPor }: { backupId: string; verificadoPor?: string }) => {
      logger.info('fiscal-hooks', 'backup_verify', 'Verifying backup', { backup_id: backupId });

      const result = await fiscalBackupManager.verificarBackup(backupId, verificadoPor);

      if (result.success) {
        logger.info('fiscal-hooks', 'backup_verify', 'Backup verified successfully', { backup_id: backupId });
      } else {
        logger.error('fiscal-hooks', 'backup_verify', 'Backup verification failed', result.message);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-backups'] });
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] });
    }
  });
};

export const useFiscalBackupRestore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      backupId,
      opciones
    }: {
      backupId: string;
      opciones?: { sobrescribir: boolean; validarIntegridad: boolean };
    }) => {
      logger.info('fiscal-hooks', 'backup_restore', 'Restoring backup', { backup_id: backupId });

      const result = await fiscalBackupManager.restaurarBackup(backupId, opciones);

      if (result.success) {
        logger.info('fiscal-hooks', 'backup_restore', 'Backup restored successfully', {
          backup_id: backupId,
          documentos_restaurados: result.documentos_restaurados
        });
      } else {
        logger.error('fiscal-hooks', 'backup_restore', 'Backup restoration failed', result.message);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidar todas las consultas de documentos fiscales ya que pueden haber cambiado
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-audit'] });
    }
  });
};

// =====================================================
// HOOKS DE TRAZABILIDAD FISCAL
// =====================================================

export const useFiscalTraceabilityStart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fiscalDocumentId,
      transactionId,
      tipoDocumento,
      sistemaOrigen,
      usuarioId
    }: {
      fiscalDocumentId: string;
      transactionId: string;
      tipoDocumento: string;
      sistemaOrigen?: string;
      usuarioId?: string;
    }) => {
      logger.info('fiscal-hooks', 'trace_start', 'Starting fiscal traceability', {
        fiscal_document_id: fiscalDocumentId,
        transaction_id: transactionId,
        tipo_documento: tipoDocumento
      });

      const result = await fiscalTraceabilityManager.iniciarTrazabilidad(
        fiscalDocumentId,
        transactionId,
        tipoDocumento,
        sistemaOrigen,
        usuarioId
      );

      if (result.success) {
        logger.info('fiscal-hooks', 'trace_start', 'Traceability started successfully', {
          workflow_id: result.workflow_id,
          total_pasos: result.total_pasos
        });
      } else {
        logger.error('fiscal-hooks', 'trace_start', 'Failed to start traceability', result.message);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['fiscal-traceability', variables.transactionId]
      });
    }
  });
};

export const useFiscalTraceabilityStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      numeroPaso,
      estado,
      opciones
    }: {
      transactionId: string;
      numeroPaso: number;
      estado: TraceStepStatus;
      opciones?: {
        datos_entrada?: any;
        datos_salida?: any;
        parametros?: any;
        error?: { codigo: string; mensaje: string; stack?: string };
        seniat_data?: { request?: any; response?: any; request_id?: string };
        duracion_ms?: number;
      };
    }) => {
      logger.debug('fiscal-hooks', 'trace_step', 'Registering trace step', {
        transaction_id: transactionId,
        paso_numero: numeroPaso,
        estado
      });

      const result = await fiscalTraceabilityManager.registrarPaso(transactionId, numeroPaso, estado, opciones);

      if (result.success) {
        logger.debug('fiscal-hooks', 'trace_step', 'Trace step registered successfully');
      } else {
        logger.error('fiscal-hooks', 'trace_step', 'Failed to register trace step', result.message);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['fiscal-traceability', variables.transactionId]
      });
    }
  });
};

export const useFiscalTraceabilityReport = (transactionId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['fiscal-traceability', transactionId],
    queryFn: async () => {
      logger.info('fiscal-hooks', 'trace_report', 'Getting traceability report', {
        transaction_id: transactionId
      });

      const result = await fiscalTraceabilityManager.obtenerTrazabilidadCompleta(transactionId);

      if (result.success) {
        logger.info('fiscal-hooks', 'trace_report', 'Traceability report retrieved successfully', {
          transaction_id: transactionId,
          eficiencia: result.report?.resumen.eficiencia
        });
      } else {
        logger.error('fiscal-hooks', 'trace_report', 'Failed to get traceability report', result.message);
        throw new Error(result.message);
      }

      return result;
    },
    enabled: options?.enabled ?? !!transactionId,
    refetchInterval: 30000, // Refetch every 30 seconds for active processes
    staleTime: 10000, // 10 segundos
    retry: 2
  });
};

export const useFiscalTraceabilityMetrics = () => {
  return useMutation({
    mutationFn: async ({ fechaDesde, fechaHasta }: { fechaDesde: string; fechaHasta: string }) => {
      logger.info('fiscal-hooks', 'trace_metrics', 'Generating traceability metrics', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      });

      const result = await fiscalTraceabilityManager.generarMetricasTrazabilidad(fechaDesde, fechaHasta);

      if (result.success) {
        logger.info('fiscal-hooks', 'trace_metrics', 'Traceability metrics generated successfully', {
          documentos_rastreados: result.metrics?.documentos_rastreados
        });
      } else {
        logger.error('fiscal-hooks', 'trace_metrics', 'Failed to generate traceability metrics', result.message);
      }

      return result;
    }
  });
};

// =====================================================
// HOOK COMBINADO PARA GESTIÓN COMPLETA
// =====================================================

export const useFiscalPersistenceManager = () => {
  const auditTracker = useFiscalAuditTracker();
  const traceStart = useFiscalTraceabilityStart();
  const traceStep = useFiscalTraceabilityStep();
  const backupExecution = useFiscalBackupExecution();

  // Función de alto nivel para inicializar persistencia completa de un documento
  const initializeFiscalPersistence = async (
    documentData: {
      fiscalDocumentId: string;
      transactionId: string;
      tipoDocumento: string;
      numeroControl?: string;
    },
    userInfo: {
      id?: string;
      nombre?: string;
      rol?: string;
      ip: string;
      userAgent?: string;
    }
  ) => {
    try {
      logger.info('fiscal-hooks', 'init_persistence', 'Initializing fiscal persistence', {
        transaction_id: documentData.transactionId,
        tipo_documento: documentData.tipoDocumento
      });

      // 1. Registrar evento de auditoría
      await auditTracker.trackOperation(
        documentData.transactionId,
        'creacion',
        `Documento fiscal creado - Tipo: ${documentData.tipoDocumento}`,
        true,
        userInfo,
        { datos_nuevos: documentData }
      );

      // 2. Iniciar trazabilidad
      const traceResult = await traceStart.mutateAsync({
        fiscalDocumentId: documentData.fiscalDocumentId,
        transactionId: documentData.transactionId,
        tipoDocumento: documentData.tipoDocumento,
        sistemaOrigen: 'web_app',
        usuarioId: userInfo.id
      });

      if (traceResult.success) {
        // 3. Registrar primer paso de trazabilidad
        await traceStep.mutateAsync({
          transactionId: documentData.transactionId,
          numeroPaso: 1,
          estado: 'completado',
          opciones: {
            datos_entrada: documentData,
            datos_salida: { documento_creado: true }
          }
        });
      }

      logger.info('fiscal-hooks', 'init_persistence', 'Fiscal persistence initialized successfully');

      return {
        success: true,
        audit_tracked: true,
        traceability_started: traceResult.success,
        workflow_id: traceResult.workflow_id
      };

    } catch (error) {
      logger.error('fiscal-hooks', 'init_persistence', 'Error initializing fiscal persistence', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  // Función para completar un paso del proceso fiscal
  const completeProcessStep = async (
    transactionId: string,
    stepNumber: number,
    stepName: string,
    success: boolean,
    data?: {
      input?: any;
      output?: any;
      error?: { code: string; message: string };
      seniat_data?: any;
      duration_ms?: number;
    }
  ) => {
    try {
      // Registrar en trazabilidad
      await traceStep.mutateAsync({
        transactionId,
        numeroPaso: stepNumber,
        estado: success ? 'completado' : 'fallido',
        opciones: {
          datos_entrada: data?.input,
          datos_salida: data?.output,
          error: data?.error,
          seniat_data: data?.seniat_data,
          duracion_ms: data?.duration_ms
        }
      });

      // Registrar en auditoría si es un paso importante
      if (['envio_seniat', 'respuesta_seniat', 'anulacion'].includes(stepName)) {
        await auditTracker.trackOperation(
          transactionId,
          stepName as FiscalOperation,
          `Paso ${stepNumber}: ${stepName}`,
          success,
          { ip: '127.0.0.1' }, // IP del sistema
          {
            datos_anteriores: data?.input,
            datos_nuevos: data?.output,
            respuesta_seniat: data?.seniat_data,
            codigo_error_seniat: data?.error?.code,
            mensaje_error: data?.error?.message
          }
        );
      }

    } catch (error) {
      logger.error('fiscal-hooks', 'complete_step', 'Error completing process step', error);
    }
  };

  return {
    // Funciones de alto nivel
    initializeFiscalPersistence,
    completeProcessStep,

    // Estados
    isInitializing: auditTracker.isTracking || traceStart.isPending,
    isProcessingStep: traceStep.isPending,

    // Hooks individuales
    auditTracker,
    traceStart,
    traceStep,
    backupExecution
  };
};

export default {
  useFiscalAuditEntry,
  useFiscalAuditQuery,
  useFiscalAuditReport,
  useFiscalAuditTracker,
  useFiscalBackupExecution,
  useFiscalBackupConfiguration,
  useFiscalBackupStatistics,
  useFiscalBackupVerification,
  useFiscalBackupRestore,
  useFiscalTraceabilityStart,
  useFiscalTraceabilityStep,
  useFiscalTraceabilityReport,
  useFiscalTraceabilityMetrics,
  useFiscalPersistenceManager
};