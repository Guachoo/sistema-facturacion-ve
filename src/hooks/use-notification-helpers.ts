import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  Bell,
  Users,
  FileText,
  Settings,
  TrendingUp,
  Mail
} from 'lucide-react';
import type { AlertaFiscal } from '@/types';

// Hook para obtener iconos y colores de alertas
export function useAlertIcons() {
  const getAlertIcon = useMemo(() => (tipo: string) => {
    switch (tipo) {
      case 'documento_rechazado_seniat':
      case 'documento_error_validacion':
        return AlertTriangle;
      case 'sistema_mantenimiento':
      case 'sistema_backup':
        return Info;
      case 'tasa_cambio_actualizada':
        return AlertCircle;
      case 'usuario_sesion_expirada':
      case 'usuario_acceso_denegado':
        return Users;
      case 'factura_vencimiento':
      case 'nota_credito_pendiente':
        return FileText;
      case 'configuracion_actualizada':
        return Settings;
      case 'metrica_rendimiento':
        return TrendingUp;
      case 'email_fallo_envio':
      case 'email_entrega_confirmada':
        return Mail;
      default:
        return Bell;
    }
  }, []);

  const getAlertColor = useMemo(() => (severidad: string) => {
    switch (severidad) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  const getAlertVariant = useMemo(() => (severidad: string) => {
    switch (severidad) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      case 'info':
      case 'success':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  }, []);

  const getAlertPriority = useMemo(() => (severidad: string) => {
    switch (severidad) {
      case 'error':
        return 4;
      case 'warning':
        return 3;
      case 'info':
        return 2;
      case 'success':
        return 1;
      default:
        return 0;
    }
  }, []);

  return {
    getAlertIcon,
    getAlertColor,
    getAlertVariant,
    getAlertPriority
  };
}

// Hook para formatear fechas de alertas
export function useAlertTimeFormatting() {
  const formatAlertTime = useMemo(() => (fecha: string) => {
    const now = new Date();
    const alertDate = new Date(fecha);
    const diffMs = now.getTime() - alertDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
    return alertDate.toLocaleDateString('es-VE');
  }, []);

  const formatDetailedTime = useMemo(() => (fecha: string) => {
    const alertDate = new Date(fecha);
    return alertDate.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const isRecent = useMemo(() => (fecha: string, minutes: number = 60) => {
    const now = new Date();
    const alertDate = new Date(fecha);
    const diffMs = now.getTime() - alertDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins <= minutes;
  }, []);

  return {
    formatAlertTime,
    formatDetailedTime,
    isRecent
  };
}

// Hook para filtrar y ordenar alertas
export function useAlertFiltering(alerts: AlertaFiscal[]) {
  const sortedAlerts = useMemo(() => {
    const { getAlertPriority } = useAlertIcons();

    return [...alerts].sort((a, b) => {
      // Primero por prioridad (severidad)
      const priorityDiff = getAlertPriority(b.severidad) - getAlertPriority(a.severidad);
      if (priorityDiff !== 0) return priorityDiff;

      // Luego por fecha (más recientes primero)
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });
  }, [alerts]);

  const filterByType = useMemo(() => (tipo: string) => {
    return alerts.filter(alert => alert.tipo === tipo);
  }, [alerts]);

  const filterBySeverity = useMemo(() => (severidad: string) => {
    return alerts.filter(alert => alert.severidad === severidad);
  }, [alerts]);

  const filterByModule = useMemo(() => (moduleName: string) => {
    return alerts.filter(alert =>
      alert.tipo.includes(moduleName) ||
      alert.documento_afectado?.tipo_documento === moduleName
    );
  }, [alerts]);

  const getRecentAlerts = useMemo(() => (hours: number = 24) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return alerts.filter(alert => new Date(alert.fecha_creacion) > cutoff);
  }, [alerts]);

  const getCriticalAlerts = useMemo(() => {
    return alerts.filter(alert =>
      alert.severidad === 'error' && alert.estado === 'activa'
    );
  }, [alerts]);

  const getGroupedAlerts = useMemo(() => {
    const grouped: Record<string, AlertaFiscal[]> = {};

    alerts.forEach(alert => {
      const key = alert.tipo;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(alert);
    });

    return grouped;
  }, [alerts]);

  return {
    sortedAlerts,
    filterByType,
    filterBySeverity,
    filterByModule,
    getRecentAlerts,
    getCriticalAlerts,
    getGroupedAlerts
  };
}

// Hook para estadísticas de alertas
export function useAlertStatistics(alerts: AlertaFiscal[]) {
  const stats = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter(alert => alert.estado === 'activa').length;
    const read = alerts.filter(alert => alert.estado === 'leida').length;
    const resolved = alerts.filter(alert => alert.estado === 'resuelta').length;

    const bySerity = {
      error: alerts.filter(alert => alert.severidad === 'error').length,
      warning: alerts.filter(alert => alert.severidad === 'warning').length,
      info: alerts.filter(alert => alert.severidad === 'info').length,
      success: alerts.filter(alert => alert.severidad === 'success').length
    };

    const byType: Record<string, number> = {};
    alerts.forEach(alert => {
      byType[alert.tipo] = (byType[alert.tipo] || 0) + 1;
    });

    const recent24h = alerts.filter(alert => {
      const alertDate = new Date(alert.fecha_creacion);
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return alertDate > cutoff;
    }).length;

    return {
      total,
      active,
      read,
      resolved,
      bySerity,
      byType,
      recent24h,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      resolvedPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }, [alerts]);

  return stats;
}

// Hook para acciones masivas de alertas
export function useAlertBulkActions() {
  const markAllAsRead = useMemo(() => async (alertIds: string[]) => {
    // En implementación real, habría un endpoint para acciones masivas
    const promises = alertIds.map(id =>
      // notificationApi.marcarAlertaComoLeida(id)
      Promise.resolve()
    );
    await Promise.all(promises);
  }, []);

  const dismissMultiple = useMemo(() => async (alertIds: string[]) => {
    const promises = alertIds.map(id =>
      // notificationApi.marcarAlertaComoLeida(id)
      Promise.resolve()
    );
    await Promise.all(promises);
  }, []);

  const deleteMultiple = useMemo(() => async (alertIds: string[]) => {
    // En implementación real, habría un endpoint para eliminar alertas
    console.log('Deleting alerts:', alertIds);
  }, []);

  return {
    markAllAsRead,
    dismissMultiple,
    deleteMultiple
  };
}