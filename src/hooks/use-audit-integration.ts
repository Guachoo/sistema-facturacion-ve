import { useCallback } from 'react';
import { auditSystem, generateDeviceFingerprint, getClientIP, type AuditAction, type AuditEntry } from '@/lib/audit-system';
import { useAuth } from '@/hooks/use-auth';

export function useAuditIntegration() {
  const { user } = useAuth();

  const logOperation = useCallback(async (
    action: AuditAction,
    resource?: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    const clientIP = await getClientIP();

    await auditSystem.log({
      userId: user.id,
      userEmail: user.email,
      userName: user.nombre,
      companyId: metadata?.companyId,
      companyRif: metadata?.companyRif,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ipAddress: clientIP,
      userAgent: navigator.userAgent,
      deviceFingerprint: generateDeviceFingerprint(),
      sessionId: `session_${Date.now()}`,
      success: true,
      metadata
    });
  }, [user]);

  const logError = useCallback(async (
    action: AuditAction,
    error: Error,
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    const clientIP = await getClientIP();

    await auditSystem.log({
      userId: user.id,
      userEmail: user.email,
      userName: user.nombre,
      companyId: metadata?.companyId,
      companyRif: metadata?.companyRif,
      action,
      resource,
      resourceId,
      ipAddress: clientIP,
      userAgent: navigator.userAgent,
      deviceFingerprint: generateDeviceFingerprint(),
      sessionId: `session_${Date.now()}`,
      success: false,
      errorMessage: error.message,
      metadata: {
        ...metadata,
        error_stack: error.stack
      }
    });
  }, [user]);

  // Wrappers para operaciones comunes
  const withAudit = useCallback(<T extends any[], R>(
    action: AuditAction,
    resource: string,
    operation: (...args: T) => Promise<R>,
    getResourceId?: (result: R) => string,
    getOldValues?: (...args: T) => Record<string, any>,
    getNewValues?: (result: R) => Record<string, any>
  ) => {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();

      try {
        const result = await operation(...args);
        const duration = Date.now() - startTime;

        await logOperation(
          action,
          resource,
          getResourceId?.(result),
          getOldValues?.(...args),
          getNewValues?.(result),
          { operation_duration_ms: duration }
        );

        return result;
      } catch (error) {
        await logError(action, error as Error, resource, undefined, {
          operation_duration_ms: Date.now() - startTime,
          args: JSON.stringify(args)
        });
        throw error;
      }
    };
  }, [logOperation, logError]);

  // Helpers específicos para operaciones CRUD
  const auditCreate = useCallback((
    resource: string,
    operation: (data: any) => Promise<any>
  ) => {
    return withAudit(
      'create_' + resource.toLowerCase().replace(/s$/, '') as AuditAction,
      resource,
      operation,
      (result) => result?.id?.toString(),
      undefined,
      (result) => result
    );
  }, [withAudit]);

  const auditUpdate = useCallback((
    resource: string,
    operation: (id: string, data: any) => Promise<any>,
    getOldData?: (id: string) => Promise<any>
  ) => {
    return withAudit(
      'update_' + resource.toLowerCase().replace(/s$/, '') as AuditAction,
      resource,
      async (id: string, data: any) => {
        const oldData = getOldData ? await getOldData(id) : undefined;
        const result = await operation(id, data);
        return { ...result, _oldData: oldData };
      },
      (result) => result.id?.toString(),
      (id, data, result) => result?._oldData,
      (result) => {
        const { _oldData, ...newData } = result;
        return newData;
      }
    );
  }, [withAudit]);

  const auditDelete = useCallback((
    resource: string,
    operation: (id: string) => Promise<any>,
    getDataBeforeDelete?: (id: string) => Promise<any>
  ) => {
    return withAudit(
      'delete_' + resource.toLowerCase().replace(/s$/, '') as AuditAction,
      resource,
      async (id: string) => {
        const dataBeforeDelete = getDataBeforeDelete ? await getDataBeforeDelete(id) : undefined;
        await operation(id);
        return { id, deletedData: dataBeforeDelete };
      },
      (result) => result.id,
      undefined,
      (result) => result.deletedData
    );
  }, [withAudit]);

  const auditExport = useCallback((
    format: string,
    operation: () => Promise<any>
  ) => {
    return withAudit(
      'export_data',
      'data_export',
      operation,
      () => `export_${Date.now()}`,
      undefined,
      () => ({ format, timestamp: new Date().toISOString() })
    );
  }, [withAudit]);

  const auditImport = useCallback((
    source: string,
    operation: (data: any) => Promise<any>
  ) => {
    return withAudit(
      'import_data',
      'data_import',
      operation,
      () => `import_${Date.now()}`,
      (data) => ({ source, record_count: Array.isArray(data) ? data.length : 1 }),
      (result) => ({ imported_count: result?.count || 0 })
    );
  }, [withAudit]);

  const auditReport = useCallback((
    reportType: string,
    operation: (params: any) => Promise<any>
  ) => {
    return withAudit(
      'report_generated',
      'report',
      operation,
      () => `report_${reportType}_${Date.now()}`,
      (params) => ({ report_type: reportType, parameters: params }),
      (result) => ({ record_count: result?.data?.length || 0 })
    );
  }, [withAudit]);

  return {
    logOperation,
    logError,
    withAudit,
    auditCreate,
    auditUpdate,
    auditDelete,
    auditExport,
    auditImport,
    auditReport
  };
}

// Hook específico para operaciones de facturación
export function useInvoiceAudit() {
  const { auditCreate, auditUpdate, auditDelete, logOperation } = useAuditIntegration();

  const auditCreateInvoice = auditCreate('invoices');
  const auditUpdateInvoice = auditUpdate('invoices');
  const auditDeleteInvoice = auditDelete('invoices');

  const auditVoidInvoice = useCallback(async (
    invoiceId: string,
    reason: string,
    operation: () => Promise<any>
  ) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      await logOperation(
        'void_invoice',
        'invoice',
        invoiceId,
        undefined,
        { void_reason: reason, voided_at: new Date().toISOString() },
        { operation_duration_ms: Date.now() - startTime }
      );
      return result;
    } catch (error) {
      await logOperation(
        'void_invoice',
        'invoice',
        invoiceId,
        undefined,
        undefined,
        {
          operation_duration_ms: Date.now() - startTime,
          error: error.message
        }
      );
      throw error;
    }
  }, [logOperation]);

  return {
    auditCreateInvoice,
    auditUpdateInvoice,
    auditDeleteInvoice,
    auditVoidInvoice
  };
}

// Hook específico para operaciones de usuarios
export function useUserAudit() {
  const { auditCreate, auditUpdate, auditDelete, logOperation } = useAuditIntegration();

  const auditCreateUser = auditCreate('users');
  const auditUpdateUser = auditUpdate('users');
  const auditDeleteUser = auditDelete('users');

  const auditChangePermissions = useCallback(async (
    userId: string,
    oldPermissions: any,
    newPermissions: any,
    operation: () => Promise<any>
  ) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      await logOperation(
        'change_permissions',
        'user',
        userId,
        oldPermissions,
        newPermissions,
        { operation_duration_ms: Date.now() - startTime }
      );
      return result;
    } catch (error) {
      await logOperation(
        'change_permissions',
        'user',
        userId,
        oldPermissions,
        newPermissions,
        {
          operation_duration_ms: Date.now() - startTime,
          error: error.message
        }
      );
      throw error;
    }
  }, [logOperation]);

  return {
    auditCreateUser,
    auditUpdateUser,
    auditDeleteUser,
    auditChangePermissions
  };
}