/**
 * Página Completa de Configuraciones del Sistema
 * Módulo amplio y funcional para todas las configuraciones
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Receipt,
  Bell,
  Settings,
  Package,
  BarChart3,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Globe,
  Mail,
  Smartphone,
  Lock,
  Eye,
  CreditCard,
  Calculator,
  Palette,
  Database,
  Clock,
  Zap
} from 'lucide-react';

// Importar componentes específicos de configuración
import { CompanySettingsTab } from '@/components/settings/company-settings-tab';
import { FiscalSettingsTab } from '@/components/settings/fiscal-settings-tab';
import { NotificationSettingsTab } from '@/components/settings/notification-settings-tab';
import { SystemSettingsTab } from '@/components/settings/system-settings-tab';
import { BillingSettingsTab } from '@/components/settings/billing-settings-tab';
import { InventorySettingsTab } from '@/components/settings/inventory-settings-tab';
import { ReportsSettingsTab } from '@/components/settings/reports-settings-tab';
import { useSettings, useSettingsImportExport } from '@/hooks/use-settings';
import { toast } from 'sonner';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('empresa');
  const { settings, isLoading, isSaving } = useSettings();
  const { exportSettings, importSettings, isExporting, isImporting } = useSettingsImportExport();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const tabs = [
    {
      id: 'empresa',
      label: 'Empresa',
      icon: Building2,
      description: 'Datos de la empresa, logos y branding',
      color: 'text-blue-600'
    },
    {
      id: 'fiscal',
      label: 'Fiscal',
      icon: Receipt,
      description: 'Configuración SENIAT, impuestos y documentos',
      color: 'text-green-600'
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones',
      icon: Bell,
      description: 'Email, alertas y comunicaciones',
      color: 'text-orange-600'
    },
    {
      id: 'sistema',
      label: 'Sistema',
      icon: Settings,
      description: 'Apariencia, seguridad e integraciones',
      color: 'text-purple-600'
    },
    {
      id: 'facturacion',
      label: 'Facturación',
      icon: CreditCard,
      description: 'Numeración, pagos y validaciones',
      color: 'text-indigo-600'
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icon: Package,
      description: 'Stock, códigos y precios',
      color: 'text-teal-600'
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: BarChart3,
      description: 'Formatos, programación y personalización',
      color: 'text-pink-600'
    }
  ];

  const handleFileUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        toast.error('Por favor selecciona un archivo JSON válido');
        event.target.value = '';
        return;
      }

      importSettings(file);
    }

    // Clear the input value to allow selecting the same file again
    event.target.value = '';
  }, [importSettings]);

  const handleImportClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isImporting && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isImporting]);

  const handleExportClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isExporting) {
      exportSettings();
    }
  }, [isExporting, exportSettings]);

  const getTabStatus = (tabId: string) => {
    // Lógica para determinar el estado de completitud de cada tab
    switch (tabId) {
      case 'empresa':
        return settings.empresa.razonSocial && settings.empresa.rif ? 'complete' : 'incomplete';
      case 'fiscal':
        return settings.fiscal.documentos.numeracionAutomatica ? 'complete' : 'incomplete';
      case 'notificaciones':
        return settings.notificaciones.email.habilitado ? 'complete' : 'incomplete';
      default:
        return 'complete';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuraciones del Sistema</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configura todos los aspectos de tu sistema de facturación
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="absolute -left-9999px opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? 'Importando...' : 'Importar'}
          </button>
          <button
            onClick={handleExportClick}
            disabled={isExporting}
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Estado de Configuración
          </CardTitle>
          <CardDescription>
            Resumen del estado de configuración de cada módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const status = getTabStatus(tab.id);
              return (
                <div
                  key={tab.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                    activeTab === tab.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.id);
                  }}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className={`h-6 w-6 ${tab.color}`} />
                    <span className="text-sm font-medium text-center">{tab.label}</span>
                    <Badge
                      variant={status === 'complete' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {status === 'complete' ? 'OK' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-1 p-3 text-xs"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Saving Indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Guardando configuraciones...</span>
            </div>
          )}

          {/* Tab Contents */}
          <TabsContent value="empresa" className="space-y-6">
            <CompanySettingsTab />
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-6">
            <FiscalSettingsTab />
          </TabsContent>

          <TabsContent value="notificaciones" className="space-y-6">
            <NotificationSettingsTab />
          </TabsContent>

          <TabsContent value="sistema" className="space-y-6">
            <SystemSettingsTab />
          </TabsContent>

          <TabsContent value="facturacion" className="space-y-6">
            <BillingSettingsTab />
          </TabsContent>

          <TabsContent value="inventario" className="space-y-6">
            <InventorySettingsTab />
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            <ReportsSettingsTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Versión: {settings.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Actualizado: {new Date(settings.ultimaActualizacion).toLocaleString('es-VE')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span>Sistema operativo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}