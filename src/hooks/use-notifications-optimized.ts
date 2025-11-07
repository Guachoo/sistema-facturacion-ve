import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '@/lib/api-client';
import type { AlertaFiscal, EstadoSistemaRealTime } from '@/types';

// Store global para evitar múltiples llamadas
let globalAlertsCache: AlertaFiscal[] = [];
let globalSystemStatusCache: EstadoSistemaRealTime | null = null;
let globalLastUpdate = 0;
let globalSubscribers = new Set<() => void>();

// Función para notificar a todos los suscriptores
const notifySubscribers = () => {
  globalSubscribers.forEach(callback => callback());
};

// Hook optimizado para alertas que evita bucles infinitos
export function useAlertsOptimized(filters?: {
  estado?: AlertaFiscal['estado'];
  severidad?: AlertaFiscal['severidad'];
  tipo?: string;
  maxItems?: number;
}) {
  const [alerts, setAlerts] = useState<AlertaFiscal[]>(globalAlertsCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Ref para evitar recreación de funciones
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const loadAlerts = useCallback(async () => {
    const now = Date.now();

    // Solo cargar si han pasado más de 10 segundos desde la última actualización
    if (now - globalLastUpdate < 10000 && globalAlertsCache.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await notificationApi.obtenerAlertas({
        estado: 'activa'
      });

      globalAlertsCache = response.alertas;
      globalLastUpdate = now;

      notifySubscribers();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await notificationApi.marcarAlertaComoLeida(alertId);
      setDismissedAlerts(prev => new Set([...prev, alertId]));

      // Actualizar cache global
      globalAlertsCache = globalAlertsCache.map(alert =>
        alert.id === alertId ? { ...alert, estado: 'leida' } : alert
      );

      notifySubscribers();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  // Suscribirse a actualizaciones globales
  useEffect(() => {
    const updateState = () => {
      let filteredAlerts = globalAlertsCache;

      // Aplicar filtros
      if (filtersRef.current?.estado) {
        filteredAlerts = filteredAlerts.filter(alert => alert.estado === filtersRef.current?.estado);
      }
      if (filtersRef.current?.severidad) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severidad === filtersRef.current?.severidad);
      }
      if (filtersRef.current?.tipo) {
        filteredAlerts = filteredAlerts.filter(alert => alert.tipo === filtersRef.current?.tipo);
      }
      if (filtersRef.current?.maxItems) {
        filteredAlerts = filteredAlerts.slice(0, filtersRef.current.maxItems);
      }

      setAlerts(filteredAlerts);
    };

    globalSubscribers.add(updateState);
    updateState(); // Actualizar inmediatamente

    return () => {
      globalSubscribers.delete(updateState);
    };
  }, []);

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    if (globalAlertsCache.length === 0) {
      loadAlerts();
    }
  }, [loadAlerts]);

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
    refreshAlerts: loadAlerts
  };
}

// Hook optimizado para system status
export function useSystemStatusOptimized(refreshInterval: number = 30000) {
  const [systemStatus, setSystemStatus] = useState<EstadoSistemaRealTime | null>(globalSystemStatusCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadSystemStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = await notificationApi.obtenerEstadoSistema();

      globalSystemStatusCache = status;
      setSystemStatus(status);
      setLastUpdate(new Date());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error loading system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (!globalSystemStatusCache) {
      loadSystemStatus();
    } else {
      setSystemStatus(globalSystemStatusCache);
    }
  }, [loadSystemStatus]);

  // Intervalo de actualización
  useEffect(() => {
    const interval = setInterval(loadSystemStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, loadSystemStatus]);

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

// Hook combinado optimizado
export function useNotificationDashboardOptimized() {
  const alerts = useAlertsOptimized({
    estado: 'activa',
    maxItems: 5 // Limitar para mejor rendimiento
  });

  const systemStatus = useSystemStatusOptimized(30000);

  return {
    alerts,
    systemStatus
  };
}