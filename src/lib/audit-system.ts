import { supabase } from '@/lib/supabase';

export type AuditAction =
  | 'login' | 'logout' | 'failed_login' | 'password_change'
  | 'create_invoice' | 'update_invoice' | 'delete_invoice' | 'void_invoice'
  | 'create_customer' | 'update_customer' | 'delete_customer'
  | 'create_item' | 'update_item' | 'delete_item'
  | 'create_user' | 'update_user' | 'delete_user' | 'change_permissions'
  | 'backup_created' | 'backup_restored' | 'config_changed'
  | 'export_data' | 'import_data' | 'report_generated'
  | 'company_switch' | 'permission_denied' | 'session_expired';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId?: string;
  companyRif?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  riskLevel: RiskLevel;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  sessionId: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AuditFilter {
  userId?: string;
  companyId?: string;
  actions?: AuditAction[];
  riskLevels?: RiskLevel[];
  dateFrom?: Date;
  dateTo?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  successRate: number;
  riskDistribution: Record<RiskLevel, number>;
  topActions: Array<{ action: AuditAction; count: number }>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  deviceStats: {
    uniqueDevices: number;
    suspiciousDevices: number;
  };
}

class AuditSystem {
  private static instance: AuditSystem;
  private eventQueue: AuditEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 segundos

  public static getInstance(): AuditSystem {
    if (!AuditSystem.instance) {
      AuditSystem.instance = new AuditSystem();
    }
    return AuditSystem.instance;
  }

  constructor() {
    this.startBatchProcessor();
  }

  private startBatchProcessor() {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = this.eventQueue.splice(0, this.BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(eventsToFlush.map(entry => ({
          user_id: entry.userId,
          user_email: entry.userEmail,
          user_name: entry.userName,
          company_id: entry.companyId,
          company_rif: entry.companyRif,
          action: entry.action,
          resource: entry.resource,
          resource_id: entry.resourceId,
          old_values: entry.oldValues,
          new_values: entry.newValues,
          risk_level: entry.riskLevel,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          device_fingerprint: entry.deviceFingerprint,
          session_id: entry.sessionId,
          success: entry.success,
          error_message: entry.errorMessage,
          duration: entry.duration,
          metadata: entry.metadata,
          created_at: entry.timestamp.toISOString()
        })));

      if (error) {
        console.error('Error flushing audit events:', error);
        // Requeue events for retry
        this.eventQueue.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Exception flushing audit events:', error);
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  public async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Análisis de riesgo automático
    auditEntry.riskLevel = this.calculateRiskLevel(auditEntry);

    // Agregar a la cola para procesamiento en lotes
    this.eventQueue.push(auditEntry);

    // Flush inmediato para eventos críticos
    if (auditEntry.riskLevel === 'critical') {
      await this.flushEvents();
    }

    // Alertas en tiempo real para eventos de alto riesgo
    if (auditEntry.riskLevel === 'high' || auditEntry.riskLevel === 'critical') {
      this.triggerRealTimeAlert(auditEntry);
    }
  }

  private calculateRiskLevel(entry: AuditEntry): RiskLevel {
    let score = 0;

    // Acciones de alto riesgo
    const highRiskActions: AuditAction[] = [
      'delete_invoice', 'void_invoice', 'delete_customer', 'delete_item',
      'delete_user', 'change_permissions', 'backup_restored', 'config_changed'
    ];

    const mediumRiskActions: AuditAction[] = [
      'failed_login', 'password_change', 'create_user', 'update_user',
      'backup_created', 'export_data', 'import_data'
    ];

    if (highRiskActions.includes(entry.action)) score += 40;
    else if (mediumRiskActions.includes(entry.action)) score += 20;
    else score += 10;

    // Fallas incrementan el riesgo
    if (!entry.success) score += 30;

    // Horarios inusuales (fuera de horario laboral)
    const hour = entry.timestamp.getHours();
    if (hour < 7 || hour > 19) score += 15;

    // Duración anormal de operación
    if (entry.duration && entry.duration > 30000) score += 10; // > 30 segundos

    // Determinar nivel de riesgo
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private async triggerRealTimeAlert(entry: AuditEntry) {
    // Implementar notificaciones en tiempo real
    console.warn(`[AUDIT ALERT] ${entry.riskLevel.toUpperCase()}: ${entry.action} by ${entry.userName}`);

    // Aquí se pueden agregar integraciones con:
    // - Email notifications
    // - Slack/Teams webhooks
    // - SMS alerts
    // - Push notifications
  }

  public async getAuditLogs(filter: AuditFilter = {}): Promise<AuditEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }

    if (filter.companyId) {
      query = query.eq('company_id', filter.companyId);
    }

    if (filter.actions && filter.actions.length > 0) {
      query = query.in('action', filter.actions);
    }

    if (filter.riskLevels && filter.riskLevels.length > 0) {
      query = query.in('risk_level', filter.riskLevels);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo.toISOString());
    }

    if (filter.success !== undefined) {
      query = query.eq('success', filter.success);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data?.map(row => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      companyId: row.company_id,
      companyRif: row.company_rif,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      oldValues: row.old_values,
      newValues: row.new_values,
      riskLevel: row.risk_level,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceFingerprint: row.device_fingerprint,
      sessionId: row.session_id,
      success: row.success,
      errorMessage: row.error_message,
      duration: row.duration,
      timestamp: new Date(row.created_at),
      metadata: row.metadata
    })) || [];
  }

  public async getAuditStats(filter: AuditFilter = {}): Promise<AuditStats> {
    const logs = await this.getAuditLogs(filter);

    const totalEvents = logs.length;
    const successCount = logs.filter(log => log.success).length;
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;

    // Distribución por nivel de riesgo
    const riskDistribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    logs.forEach(log => {
      riskDistribution[log.riskLevel]++;
    });

    // Top acciones
    const actionCounts = new Map<AuditAction, number>();
    logs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top usuarios
    const userCounts = new Map<string, { userName: string; count: number }>();
    logs.forEach(log => {
      const existing = userCounts.get(log.userId);
      userCounts.set(log.userId, {
        userName: log.userName,
        count: (existing?.count || 0) + 1
      });
    });

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, userName: data.userName, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribución por hora
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: logs.filter(log => log.timestamp.getHours() === hour).length
    }));

    // Estadísticas de dispositivos
    const uniqueDevices = new Set(logs.map(log => log.deviceFingerprint)).size;
    const suspiciousDevices = new Set(
      logs.filter(log => log.riskLevel === 'high' || log.riskLevel === 'critical')
        .map(log => log.deviceFingerprint)
    ).size;

    return {
      totalEvents,
      successRate,
      riskDistribution,
      topActions,
      topUsers,
      hourlyDistribution,
      deviceStats: {
        uniqueDevices,
        suspiciousDevices
      }
    };
  }

  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush final de eventos pendientes
    this.flushEvents();
  }
}

export const auditSystem = AuditSystem.getInstance();

// Hook para facilitar el uso en componentes React
export function useAuditSystem() {
  const logAuditEvent = async (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    await auditSystem.log(entry);
  };

  const getAuditLogs = async (filter?: AuditFilter) => {
    return await auditSystem.getAuditLogs(filter);
  };

  const getAuditStats = async (filter?: AuditFilter) => {
    return await auditSystem.getAuditStats(filter);
  };

  return {
    logAuditEvent,
    getAuditLogs,
    getAuditStats
  };
}

// Utilidades para generar fingerprints de dispositivos
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas.toDataURL()
  ].join('|');

  return btoa(fingerprint).substring(0, 32);
}

export function getClientIP(): Promise<string> {
  return fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => data.ip)
    .catch(() => 'unknown');
}