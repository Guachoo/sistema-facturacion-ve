/**
 * Hooks para gestión de configuraciones del sistema
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SystemSettings, SettingsForm } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

// Simular API de configuraciones (reemplazar con API real)
const STORAGE_KEY = 'axiona_system_settings';

const settingsApi = {
  // Obtener configuraciones
  getSettings: async (): Promise<SystemSettings> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge con defaults para nuevas configuraciones
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }
    return DEFAULT_SETTINGS;
  },

  // Guardar configuraciones
  saveSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    const toSave = {
      ...settings,
      ultimaActualizacion: new Date().toISOString(),
      usuarioActualizacion: 'usuario_actual' // TODO: obtener del contexto de auth
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));

    return toSave;
  },

  // Guardar sección específica
  saveSection: async <K extends keyof SystemSettings>(
    section: K,
    data: SystemSettings[K]
  ): Promise<SystemSettings> => {
    const current = await settingsApi.getSettings();
    const updated = {
      ...current,
      [section]: data,
      ultimaActualizacion: new Date().toISOString(),
      usuarioActualizacion: 'usuario_actual'
    };

    return settingsApi.saveSettings(updated);
  },

  // Resetear a configuraciones por defecto
  resetSettings: async (): Promise<SystemSettings> => {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_SETTINGS;
  },

  // Exportar configuraciones
  exportSettings: async (): Promise<string> => {
    const settings = await settingsApi.getSettings();
    return JSON.stringify(settings, null, 2);
  },

  // Importar configuraciones
  importSettings: async (jsonData: string): Promise<SystemSettings> => {
    try {
      const imported = JSON.parse(jsonData);
      const merged = { ...DEFAULT_SETTINGS, ...imported };
      return settingsApi.saveSettings(merged);
    } catch (error) {
      throw new Error('Formato de archivo inválido');
    }
  }
};

// Hook principal para configuraciones
export function useSettings() {
  const queryClient = useQueryClient();

  const {
    data: settings = DEFAULT_SETTINGS,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });

  const saveSettingsMutation = useMutation({
    mutationFn: settingsApi.saveSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      toast.success('Configuraciones guardadas correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });

  const saveSectionMutation = useMutation({
    mutationFn: ({ section, data }: { section: keyof SystemSettings; data: any }) =>
      settingsApi.saveSection(section, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      toast.success('Configuración actualizada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });

  const resetMutation = useMutation({
    mutationFn: settingsApi.resetSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      toast.success('Configuraciones restauradas por defecto');
    },
    onError: (error: Error) => {
      toast.error(`Error al restaurar: ${error.message}`);
    }
  });

  return {
    // Data
    settings,
    isLoading,
    error,

    // Actions
    saveSettings: saveSettingsMutation.mutate,
    saveSection: saveSectionMutation.mutate,
    resetSettings: resetMutation.mutate,
    refetch,

    // States
    isSaving: saveSettingsMutation.isPending || saveSectionMutation.isPending,
    isResetting: resetMutation.isPending
  };
}

// Hook para configuraciones de empresa
export function useCompanySettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateCompanySettings = (data: SystemSettings['empresa']) => {
    saveSection({ section: 'empresa', data });
  };

  return {
    companySettings: settings.empresa,
    updateCompanySettings,
    isSaving
  };
}

// Hook para configuraciones fiscales
export function useFiscalSettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateFiscalSettings = (data: SystemSettings['fiscal']) => {
    saveSection({ section: 'fiscal', data });
  };

  return {
    fiscalSettings: settings.fiscal,
    updateFiscalSettings,
    isSaving
  };
}

// Hook para configuraciones de notificaciones
export function useNotificationSettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateNotificationSettings = (data: SystemSettings['notificaciones']) => {
    saveSection({ section: 'notificaciones', data });
  };

  return {
    notificationSettings: settings.notificaciones,
    updateNotificationSettings,
    isSaving
  };
}

// Hook para configuraciones de sistema
export function useSystemSettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateSystemSettings = (data: SystemSettings['sistema']) => {
    saveSection({ section: 'sistema', data });
  };

  return {
    systemSettings: settings.sistema,
    updateSystemSettings,
    isSaving
  };
}

// Hook para configuraciones de facturación
export function useBillingSettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateBillingSettings = (data: SystemSettings['facturacion']) => {
    saveSection({ section: 'facturacion', data });
  };

  return {
    billingSettings: settings.facturacion,
    updateBillingSettings,
    isSaving
  };
}

// Hook para configuraciones de inventario
export function useInventorySettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateInventorySettings = (data: SystemSettings['inventario']) => {
    saveSection({ section: 'inventario', data });
  };

  return {
    inventorySettings: settings.inventario,
    updateInventorySettings,
    isSaving
  };
}

// Hook para configuraciones de reportes
export function useReportsSettings() {
  const { settings, saveSection, isSaving } = useSettings();

  const updateReportsSettings = (data: SystemSettings['reportes']) => {
    saveSection({ section: 'reportes', data });
  };

  return {
    reportsSettings: settings.reportes,
    updateReportsSettings,
    isSaving
  };
}

// Hook para importar/exportar configuraciones
export function useSettingsImportExport() {
  const { refetch } = useSettings();

  const exportMutation = useMutation({
    mutationFn: settingsApi.exportSettings,
    onSuccess: (data) => {
      // Crear archivo y descargar
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axiona-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Configuraciones exportadas correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al exportar: ${error.message}`);
    }
  });

  const importMutation = useMutation({
    mutationFn: settingsApi.importSettings,
    onSuccess: () => {
      refetch();
      toast.success('Configuraciones importadas correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al importar: ${error.message}`);
    }
  });

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      importMutation.mutate(content);
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  return {
    exportSettings: exportMutation.mutate,
    importSettings: handleFileImport,
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending
  };
}

// Hook para validaciones de formularios
export function useSettingsValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: any, rules: string[]): string | null => {
    for (const rule of rules) {
      switch (rule) {
        case 'required':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            return 'Este campo es requerido';
          }
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Formato de email inválido';
          }
          break;
        case 'url':
          if (value && !/^https?:\/\/.+/.test(value)) {
            return 'Formato de URL inválido';
          }
          break;
        case 'positive':
          if (value && Number(value) <= 0) {
            return 'Debe ser un número positivo';
          }
          break;
        case 'percentage':
          if (value && (Number(value) < 0 || Number(value) > 100)) {
            return 'Debe ser un porcentaje entre 0 y 100';
          }
          break;
        case 'rif':
          if (value && !/^[VEJPG]-?\d{8}-?\d$/i.test(value.replace(/\s/g, ''))) {
            return 'Formato de RIF inválido (ej: V-27853152-6, J-12345678-9)';
          }
          break;
      }
    }
    return null;
  };

  const validate = (formData: Record<string, any>, validationRules: Record<string, string[]>) => {
    const newErrors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(validationRules)) {
      const error = validateField(field, formData[field], rules);
      if (error) {
        newErrors[field] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => setErrors({});

  return {
    errors,
    validate,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0
  };
}