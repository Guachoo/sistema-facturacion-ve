import { useState, useEffect, useRef } from 'react';
import { notificationApi } from '@/lib/api-client';
import type { AlertaFiscal, EstadoSistemaRealTime } from '@/types';

// Cache global simple para evitar múltiples llamadas
const CACHE_DURATION = 30000; // 30 segundos
let alertsCache: { data: AlertaFiscal[]; timestamp: number } | null = null;
let systemStatusCache: { data: EstadoSistemaRealTime; timestamp: number } | null = null;

// Hook simple para alertas SIN intervals automáticos
export function useSimpleAlerts(enabled: boolean = true) {
  const [alerts, setAlerts] = useState<AlertaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadAlerts = async () => {
    if (!enabled) return;

    const now = Date.now();

    // Usar cache si es reciente
    if (alertsCache && (now - alertsCache.timestamp) < CACHE_DURATION) {
      setAlerts(alertsCache.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await notificationApi.obtenerAlertas({ estado: 'activa' });
      const alertData = response.alertas || [];

      // Actualizar cache
      alertsCache = { data: alertData, timestamp: now };
      setAlerts(alertData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar alertas');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar solo una vez al montar
  useEffect(() => {
    if (enabled && !loadedRef.current) {
      loadedRef.current = true;
      loadAlerts();
    }
  }, [enabled]);

  const dismissAlert = async (alertId: string) => {
    try {
      await notificationApi.marcarAlertaComoLeida(alertId);
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, estado: 'leida' } : alert
      ));

      // Actualizar cache también
      if (alertsCache) {
        alertsCache.data = alertsCache.data.map(alert =>
          alert.id === alertId ? { ...alert, estado: 'leida' } : alert
        );
      }
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  return {
    alerts,
    loading,
    error,
    dismissAlert,
    refreshAlerts: loadAlerts
  };
}

// Hook simple para system status SIN intervals automáticos
export function useSimpleSystemStatus(enabled: boolean = true) {
  const [systemStatus, setSystemStatus] = useState<EstadoSistemaRealTime | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const loadedRef = useRef(false);

  const loadSystemStatus = async () => {
    if (!enabled) return;

    const now = Date.now();

    // Usar cache si es reciente
    if (systemStatusCache && (now - systemStatusCache.timestamp) < CACHE_DURATION) {
      setSystemStatus(systemStatusCache.data);
      setLastUpdate(new Date(systemStatusCache.timestamp));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const status = await notificationApi.obtenerEstadoSistema();

      // Actualizar cache
      systemStatusCache = { data: status, timestamp: now };
      setSystemStatus(status);
      setLastUpdate(new Date(now));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estado del sistema');
      console.error('Error loading system status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar solo una vez al montar
  useEffect(() => {
    if (enabled && !loadedRef.current) {
      loadedRef.current = true;
      loadSystemStatus();
    }
  }, [enabled]);

  return {
    systemStatus,
    loading,
    error,
    lastUpdate,
    refreshSystemStatus: loadSystemStatus
  };
}

// Hook para casos específicos con filtros
export function useFilteredAlerts(filters: {
  severidad?: 'error' | 'warning' | 'info' | 'success';
  maxItems?: number;
  enabled?: boolean;
}) {
  const { alerts, loading, error, dismissAlert, refreshAlerts } = useSimpleAlerts(filters.enabled !== false);

  // Aplicar filtros localmente
  let filteredAlerts = alerts;

  if (filters.severidad) {
    filteredAlerts = filteredAlerts.filter(alert => alert.severidad === filters.severidad);
  }

  if (filters.maxItems) {
    filteredAlerts = filteredAlerts.slice(0, filters.maxItems);
  }

  const unreadCount = filteredAlerts.filter(alert => alert.estado === 'activa').length;
  const criticalCount = filteredAlerts.filter(alert =>
    alert.estado === 'activa' && (alert.severidad === 'error' || alert.severidad === 'warning')
  ).length;

  return {
    alerts: filteredAlerts,
    loading,
    error,
    unreadCount,
    criticalCount,
    dismissAlert,
    refreshAlerts
  };
}