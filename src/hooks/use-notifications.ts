import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '@/lib/api-client';
import type { AlertaFiscal, EstadoSistemaRealTime } from '@/types';

// Hook para gestionar alertas fiscales
export function useAlerts(filters?: {
  estado?: AlertaFiscal['estado'];
  severidad?: AlertaFiscal['severidad'];
  tipo?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [alerts, setAlerts] = useState<AlertaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationApi.obtenerAlertas(filters);
      setAlerts(response.alertas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await notificationApi.marcarAlertaComoLeida(alertId);
      setDismissedAlerts(prev => new Set([...prev, alertId]));
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, estado: 'leida' } : alert
      ));
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  const createAlert = useCallback(async (
    alertData: Omit<AlertaFiscal, 'id' | 'fecha_creacion' | 'estado'>
  ) => {
    try {
      const response = await notificationApi.crearAlerta(alertData);
      if (response.success) {
        await loadAlerts(); // Recargar alertas después de crear una nueva
      }
      return response;
    } catch (err) {
      console.error('Error creating alert:', err);
      throw err;
    }
  }, [loadAlerts]);

  useEffect(() => {
    loadAlerts();
  }, []); // Solo cargar una vez al montar

  useEffect(() => {
    if (filters?.autoRefresh !== false && filters?.refreshInterval) {
      const interval = setInterval(loadAlerts, filters.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [filters?.autoRefresh, filters?.refreshInterval]); // Separar el intervalo del callback

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
  const unreadCount = visibleAlerts.filter(alert => alert.estado === 'activa').length;
  const criticalCount = visibleAlerts.filter(alert =>
    alert.estado === 'activa' && (alert.severidad === 'error' || alert.severidad === 'warning')
  ).length;

  return {
    alerts: visibleAlerts,
    allAlerts: alerts,
    loading,
    error,
    unreadCount,
    criticalCount,
    dismissAlert,
    createAlert,
    refreshAlerts: loadAlerts
  };
}

// Hook para el estado del sistema en tiempo real
export function useSystemStatus(refreshInterval: number = 10000) {
  const [systemStatus, setSystemStatus] = useState<EstadoSistemaRealTime | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadSystemStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await notificationApi.obtenerEstadoSistema();
      setSystemStatus(status);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error loading system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemStatus();
  }, []); // Solo cargar una vez al montar

  useEffect(() => {
    const interval = setInterval(loadSystemStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]); // Solo depender del intervalo

  const isSystemHealthy = systemStatus ? (
    systemStatus.seniat.estado === 'online' &&
    systemStatus.tfhka.estado === 'conectado'
  ) : false;

  const systemScore = systemStatus ? (
    Math.round((
      systemStatus.metricas_rendimiento.tasa_exito_email +
      systemStatus.metricas_rendimiento.tasa_exito_seniat
    ) / 2)
  ) : 0;

  return {
    systemStatus,
    loading,
    error,
    lastUpdate,
    isSystemHealthy,
    systemScore,
    refreshSystemStatus: loadSystemStatus
  };
}

// Hook para envío de emails fiscales
export function useEmailNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = useCallback(async (emailData: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationApi.enviarCorreo(emailData);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error sending email:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const trackEmail = useCallback(async (trackingData: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationApi.rastrearCorreo(trackingData);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error tracking email:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendEmail,
    trackEmail,
    loading,
    error
  };
}

// Hook combinado para dashboard completo
export function useNotificationDashboard() {
  const alerts = useAlerts({
    estado: 'activa',
    autoRefresh: true,
    refreshInterval: 30000
  });

  const systemStatus = useSystemStatus(10000);

  const emailNotifications = useEmailNotifications();

  return {
    alerts,
    systemStatus,
    emailNotifications
  };
}

// Hook para alertas específicas de un módulo
export function useModuleAlerts(moduleName: string) {
  return useAlerts({
    estado: 'activa',
    tipo: `${moduleName}_error`,
    autoRefresh: true,
    refreshInterval: 15000
  });
}

// Hook para métricas de rendimiento específicas
export function usePerformanceMetrics() {
  const { systemStatus } = useSystemStatus(5000);

  const metrics = systemStatus?.metricas_rendimiento || {
    tiempo_emision_promedio_ms: 0,
    tasa_exito_email: 0,
    tasa_exito_seniat: 0,
    documentos_por_minuto: 0
  };

  const trends = {
    emailSuccess: metrics.tasa_exito_email >= 95 ? 'good' : metrics.tasa_exito_email >= 85 ? 'warning' : 'poor',
    seniatSuccess: metrics.tasa_exito_seniat >= 90 ? 'good' : metrics.tasa_exito_seniat >= 80 ? 'warning' : 'poor',
    emissionSpeed: metrics.tiempo_emision_promedio_ms <= 3000 ? 'good' : metrics.tiempo_emision_promedio_ms <= 5000 ? 'warning' : 'poor',
    throughput: metrics.documentos_por_minuto >= 2 ? 'good' : metrics.documentos_por_minuto >= 1 ? 'warning' : 'poor'
  };

  return {
    metrics,
    trends,
    loading: !systemStatus
  };
}