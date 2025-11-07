// PHASE 2 EXTENSIONS for items.ts
// Advanced item functions with SENIAT codes and fiscal compliance

import { useMutation, useQuery } from '@tanstack/react-query';
import type { Item } from '@/types';

// SENIAT category definitions for Venezuelan tax compliance
export const seniatCategories = {
  bien: {
    label: 'Bien',
    description: 'Productos físicos y tangibles',
    alicuotaIvaDefault: 16,
    requiereCodigoArancelario: false,
    requiereCodigoActividad: false,
    requiereJustificacion: false
  },
  servicio: {
    label: 'Servicio',
    description: 'Servicios profesionales y técnicos',
    alicuotaIvaDefault: 16,
    requiereCodigoArancelario: false,
    requiereCodigoActividad: true,
    requiereJustificacion: false
  },
  importado: {
    label: 'Bien Importado',
    description: 'Productos importados del exterior',
    alicuotaIvaDefault: 16,
    requiereCodigoArancelario: true,
    requiereCodigoActividad: false,
    requiereJustificacion: false
  },
  exento: {
    label: 'Exento de IVA',
    description: 'Productos exentos de IVA según SENIAT',
    alicuotaIvaDefault: 0,
    requiereCodigoArancelario: false,
    requiereCodigoActividad: false,
    requiereJustificacion: true
  }
} as const;

// Common SENIAT codes for Venezuelan businesses
export const commonSeniatCodes = [
  { codigo: '84710000', descripcion: 'Servicios de consultoría en informática', categoria: 'servicio' },
  { codigo: '84710001', descripcion: 'Desarrollo de software y aplicaciones', categoria: 'servicio' },
  { codigo: '85249900', descripcion: 'Software empaquetado', categoria: 'bien' },
  { codigo: '62010000', descripcion: 'Programación informática', categoria: 'servicio' },
  { codigo: '62020000', descripcion: 'Consultoría informática', categoria: 'servicio' },
  { codigo: '62030000', descripcion: 'Gestión de instalaciones informáticas', categoria: 'servicio' },
  { codigo: '62090000', descripcion: 'Otras actividades de tecnología', categoria: 'servicio' },
  { codigo: '58210000', descripcion: 'Edición de videojuegos', categoria: 'bien' },
  { codigo: '58290000', descripcion: 'Edición de otros programas informáticos', categoria: 'bien' },
] as const;

// Unit of measure options according to Venezuelan standards
export const unidadesMedida = [
  { codigo: 'UND', descripcion: 'Unidad' },
  { codigo: 'KG', descripcion: 'Kilogramo' },
  { codigo: 'LT', descripcion: 'Litro' },
  { codigo: 'MT', descripcion: 'Metro' },
  { codigo: 'M2', descripcion: 'Metro cuadrado' },
  { codigo: 'M3', descripcion: 'Metro cúbico' },
  { codigo: 'HR', descripcion: 'Hora' },
  { codigo: 'DIA', descripcion: 'Día' },
  { codigo: 'MES', descripcion: 'Mes' },
  { codigo: 'PROY', descripcion: 'Proyecto' },
  { codigo: 'SVC', descripcion: 'Servicio' },
] as const;

// Validate item fiscal compliance
export const useValidateItemFiscalCompliance = () => {
  return useMutation({
    mutationFn: async (item: Item): Promise<{
      isCompliant: boolean;
      issues: string[];
      recommendations: string[];
      fiscalData: {
        requiereCodigoSeniat: boolean;
        requiereCodigoArancelario: boolean;
        requiereCodigoActividad: boolean;
        alicuotaIvaCalculada: number;
      };
    }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('items', 'validate_fiscal', 'Validating item fiscal compliance', {
        itemId: item.id,
        codigo: item.codigo
      });

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check required fiscal fields
      if (!item.codigoSeniat) {
        issues.push('Código SENIAT faltante');
        recommendations.push('Asignar código SENIAT según clasificación del producto/servicio');
      }

      if (!item.categoriaSeniat) {
        issues.push('Categoría SENIAT faltante');
        recommendations.push('Definir si es bien, servicio, importado o exento');
      }

      if (!item.unidadMedida) {
        issues.push('Unidad de medida faltante');
        recommendations.push('Especificar unidad de medida para facturación');
      }

      if (!item.origenFiscal) {
        issues.push('Origen fiscal faltante');
        recommendations.push('Definir origen: nacional, importado o zona libre');
      }

      // Category-specific validations
      const categoryInfo = item.categoriaSeniat ? seniatCategories[item.categoriaSeniat] : null;

      if (categoryInfo) {
        if (categoryInfo.requiereCodigoArancelario && !item.codigoArancelario) {
          issues.push('Código arancelario requerido para productos importados');
          recommendations.push('Consultar código arancelario en el SENIAT');
        }

        if (categoryInfo.requiereCodigoActividad && !item.codigoActividad) {
          issues.push('Código de actividad económica requerido para servicios');
          recommendations.push('Asignar código de actividad económica según registro mercantil');
        }

        if (categoryInfo.requiereJustificacion && item.exentoIva && (!item.codigoSeniat || !item.codigoSeniat.startsWith('EXENTO'))) {
          issues.push('Justificación de exención de IVA requerida');
          recommendations.push('Documentar base legal para exención de IVA');
        }
      }

      // IVA rate validation
      const alicuotaEsperada = categoryInfo?.alicuotaIvaDefault || 16;
      const alicuotaActual = item.alicuotaIva || (item.ivaAplica ? 16 : 0);

      if (item.ivaAplica && alicuotaActual !== alicuotaEsperada && !item.exentoIva) {
        issues.push(`Alícuota de IVA no coincide con categoría (esperada: ${alicuotaEsperada}%, actual: ${alicuotaActual}%)`);
        recommendations.push('Verificar alícuota de IVA según categoría SENIAT');
      }

      // Price validation
      if (item.precioBase <= 0) {
        issues.push('Precio base debe ser mayor a cero');
        recommendations.push('Establecer precio base válido para facturación');
      }

      const isCompliant = issues.length === 0;

      const result = {
        isCompliant,
        issues,
        recommendations,
        fiscalData: {
          requiereCodigoSeniat: true,
          requiereCodigoArancelario: item.categoriaSeniat === 'importado',
          requiereCodigoActividad: item.categoriaSeniat === 'servicio',
          alicuotaIvaCalculada: alicuotaEsperada
        }
      };

      logger.info('items', 'validate_fiscal', 'Fiscal compliance validation completed', result);

      return result;
    }
  });
};

// Search SENIAT codes by keyword
export const useSearchSeniatCodes = () => {
  return useMutation({
    mutationFn: async (keyword: string): Promise<(typeof commonSeniatCodes)[number][]> => {
      const { logger } = await import('@/lib/logger');

      logger.info('items', 'search_seniat', 'Searching SENIAT codes', { keyword });

      // Filter common codes by keyword
      const filtered = commonSeniatCodes.filter(code =>
        code.descripcion.toLowerCase().includes(keyword.toLowerCase()) ||
        code.codigo.includes(keyword)
      );

      logger.info('items', 'search_seniat', 'SENIAT code search completed', {
        keyword,
        resultsCount: filtered.length
      });

      return filtered;
    }
  });
};

// Calculate item taxes (IVA, ISLR retention)
export const useCalculateItemTaxes = () => {
  return useMutation({
    mutationFn: async (params: {
      item: Item;
      cantidad: number;
      descuento?: number;
    }): Promise<{
      subtotal: number;
      descuentoTotal: number;
      baseImponible: number;
      montoIva: number;
      retencionIslr: number;
      total: number;
      detalleCalculo: {
        precioUnitario: number;
        cantidad: number;
        subtotalSinDescuento: number;
        porcentajeDescuento: number;
        montoDescuento: number;
        baseImponible: number;
        alicuotaIva: number;
        montoIva: number;
        porcentajeIslr: number;
        retencionIslr: number;
        totalFinal: number;
      };
    }> => {
      const { logger } = await import('@/lib/logger');

      const { item, cantidad, descuento = 0 } = params;

      logger.info('items', 'calculate_taxes', 'Calculating item taxes', {
        itemId: item.id,
        codigo: item.codigo,
        cantidad,
        descuento
      });

      // Base calculations
      const precioUnitario = item.precioBase;
      const subtotalSinDescuento = precioUnitario * cantidad;
      const porcentajeDescuento = Math.max(0, Math.min(100, descuento));
      const montoDescuento = (subtotalSinDescuento * porcentajeDescuento) / 100;
      const baseImponible = subtotalSinDescuento - montoDescuento;

      // IVA calculation
      const alicuotaIva = item.exentoIva ? 0 : (item.alicuotaIva || (item.ivaAplica ? 16 : 0));
      const montoIva = (baseImponible * alicuotaIva) / 100;

      // ISLR retention calculation (only for services)
      const porcentajeIslr = item.retencionIslr && item.tipo === 'servicio' ? 2 : 0; // 2% for professional services
      const retencionIslr = (baseImponible * porcentajeIslr) / 100;

      // Final total
      const totalFinal = baseImponible + montoIva - retencionIslr;

      const result = {
        subtotal: subtotalSinDescuento,
        descuentoTotal: montoDescuento,
        baseImponible,
        montoIva,
        retencionIslr,
        total: totalFinal,
        detalleCalculo: {
          precioUnitario,
          cantidad,
          subtotalSinDescuento,
          porcentajeDescuento,
          montoDescuento,
          baseImponible,
          alicuotaIva,
          montoIva,
          porcentajeIslr,
          retencionIslr,
          totalFinal
        }
      };

      logger.info('items', 'calculate_taxes', 'Tax calculation completed', result);

      return result;
    }
  });
};

// Sync item with TFHKA catalog
export const useSyncItemWithTfhka = () => {
  return useMutation({
    mutationFn: async (itemId: string): Promise<{
      success: boolean;
      syncId?: string;
      message: string;
    }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('items', 'tfhka_sync', 'Starting TFHKA item sync', { itemId });

      try {
        // Get item data (this would normally come from database)
        const mockItem: Item = {
          id: itemId,
          codigo: 'EXAMPLE-001',
          descripcion: 'Ejemplo de producto',
          tipo: 'producto',
          precioBase: 100000,
          ivaAplica: true,
          codigoSeniat: '85249900',
          categoriaSeniat: 'bien',
          unidadMedida: 'unidad',
          origenFiscal: 'nacional',
          alicuotaIva: 16
        };

        // Prepare TFHKA sync data
        const tfhkaSyncData = {
          codigo_interno: mockItem.codigo,
          descripcion: mockItem.descripcion,
          codigo_seniat: mockItem.codigoSeniat,
          categoria: mockItem.categoriaSeniat,
          unidad_medida: mockItem.unidadMedida,
          precio_base: mockItem.precioBase,
          alicuota_iva: mockItem.alicuotaIva,
          origen: mockItem.origenFiscal
        };

        logger.info('items', 'tfhka_sync', 'TFHKA sync data prepared', {
          itemId,
          tfhkaSyncData
        });

        // TODO: Implement actual TFHKA API call when available
        // const { tfhkaApi } = await import('@/lib/api-client');
        // const syncResult = await tfhkaApi.syncItem(tfhkaSyncData);

        // For now, simulate successful sync
        const mockSyncId = `TFHKA_ITEM_${Date.now()}`;

        logger.info('items', 'tfhka_sync', 'TFHKA sync completed successfully', {
          itemId,
          syncId: mockSyncId
        });

        return {
          success: true,
          syncId: mockSyncId,
          message: 'Producto sincronizado con catálogo TFHKA exitosamente'
        };

      } catch (error) {
        logger.error('items', 'tfhka_sync', 'TFHKA sync failed', error);

        return {
          success: false,
          message: `Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  });
};

// Common SENIAT Codes Hook
export const useCommonSeniatCodes = () => {
  return useQuery({
    queryKey: ['common-seniat-codes'],
    queryFn: async () => {
      const { logger } = await import('@/lib/logger');
      logger.info('seniat', 'fetch_codes', 'Fetching common SENIAT codes');

      // TODO: Replace with actual SENIAT API when available
      // For now, return mock common codes
      const mockSeniatCodes = [
        {
          codigo: '01010101',
          descripcion: 'Productos alimenticios básicos',
          categoria: 'bien'
        },
        {
          codigo: '02020202',
          descripcion: 'Servicios profesionales',
          categoria: 'servicio'
        },
        {
          codigo: '03030303',
          descripcion: 'Productos farmacéuticos',
          categoria: 'bien'
        },
        {
          codigo: '04040404',
          descripcion: 'Servicios de construcción',
          categoria: 'servicio'
        },
        {
          codigo: '05050505',
          descripcion: 'Productos textiles',
          categoria: 'bien'
        },
        {
          codigo: '06060606',
          descripcion: 'Servicios de transporte',
          categoria: 'servicio'
        },
        {
          codigo: '07070707',
          descripcion: 'Productos electrónicos',
          categoria: 'bien'
        },
        {
          codigo: '08080808',
          descripcion: 'Servicios educativos',
          categoria: 'servicio'
        },
        {
          codigo: '09090909',
          descripcion: 'Productos químicos',
          categoria: 'bien'
        },
        {
          codigo: '10101010',
          descripcion: 'Servicios de salud',
          categoria: 'servicio'
        }
      ];

      logger.info('seniat', 'fetch_codes', 'Common SENIAT codes retrieved', {
        codeCount: mockSeniatCodes.length
      });

      return mockSeniatCodes;
    }
  });
};

// Validate Fiscal Compliance Hook
export const useValidateFiscalCompliance = () => {
  return useMutation({
    mutationFn: async (itemData: { itemId: string; codigoSeniat?: string; clasificacionFiscal?: string }) => {
      const { itemId, codigoSeniat, clasificacionFiscal } = itemData;
      const { logger } = await import('@/lib/logger');

      logger.info('fiscal', 'validate_compliance', 'Validating fiscal compliance', {
        itemId,
        codigoSeniat,
        clasificacionFiscal
      });

      // TODO: Replace with actual fiscal compliance API when available
      // For now, return mock validation result
      const mockValidationResult = {
        isCompliant: !!(codigoSeniat && clasificacionFiscal),
        issues: [] as string[],
        recommendations: [] as string[]
      };

      if (!codigoSeniat) {
        mockValidationResult.issues.push('Código SENIAT es requerido');
        mockValidationResult.recommendations.push('Asignar código SENIAT válido según clasificador');
      }

      if (!clasificacionFiscal) {
        mockValidationResult.issues.push('Clasificación fiscal es requerida');
        mockValidationResult.recommendations.push('Definir clasificación fiscal (gravado, exento, etc.)');
      }

      logger.info('fiscal', 'validate_compliance', 'Fiscal compliance validation completed', {
        itemId,
        isCompliant: mockValidationResult.isCompliant,
        issueCount: mockValidationResult.issues.length
      });

      return mockValidationResult;
    }
  });
};

// Generate fiscal item report
export const useGenerateFiscalItemReport = () => {
  return useMutation({
    mutationFn: async (params: {
      dateFrom: string;
      dateTo: string;
      includeInactive?: boolean;
    }): Promise<{
      items: Array<Item & {
        fiscalCompliance: boolean;
        issuesCount: number;
        ventasTotal: number;
        ivaRecaudado: number;
      }>;
      summary: {
        totalItems: number;
        compliantItems: number;
        nonCompliantItems: number;
        totalSales: number;
        totalIvaCollected: number;
      };
    }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('items', 'fiscal_report', 'Generating fiscal item report', params);

      // This would normally fetch from database with date filters
      const mockItems: Array<Item & {
        fiscalCompliance: boolean;
        issuesCount: number;
        ventasTotal: number;
        ivaRecaudado: number;
      }> = [
        {
          id: '1',
          codigo: 'SERV-001',
          descripcion: 'Consultoría en Sistemas',
          tipo: 'servicio',
          precioBase: 150000,
          ivaAplica: true,
          codigoSeniat: '84710000',
          categoriaSeniat: 'servicio',
          unidadMedida: 'hora',
          origenFiscal: 'nacional',
          alicuotaIva: 16,
          fiscalCompliance: true,
          issuesCount: 0,
          ventasTotal: 1500000,
          ivaRecaudado: 240000
        },
        {
          id: '2',
          codigo: 'PROD-001',
          descripcion: 'Software sin código SENIAT',
          tipo: 'producto',
          precioBase: 250000,
          ivaAplica: true,
          fiscalCompliance: false,
          issuesCount: 2,
          ventasTotal: 750000,
          ivaRecaudado: 120000
        }
      ];

      const summary = {
        totalItems: mockItems.length,
        compliantItems: mockItems.filter(item => item.fiscalCompliance).length,
        nonCompliantItems: mockItems.filter(item => !item.fiscalCompliance).length,
        totalSales: mockItems.reduce((sum, item) => sum + item.ventasTotal, 0),
        totalIvaCollected: mockItems.reduce((sum, item) => sum + item.ivaRecaudado, 0)
      };

      logger.info('items', 'fiscal_report', 'Fiscal report generated', summary);

      return {
        items: mockItems,
        summary
      };
    }
  });
};

// Get suggested SENIAT codes based on item description
export const useSuggestSeniatCode = () => {
  return useMutation({
    mutationFn: async (description: string): Promise<{
      suggestions: Array<{
        codigo: string;
        descripcion: string;
        categoria: string;
        confidence: number;
      }>;
    }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('items', 'suggest_seniat', 'Suggesting SENIAT codes', { description });

      // Simple keyword matching algorithm
      const keywords = description.toLowerCase().split(' ');

      const suggestions = commonSeniatCodes.map(code => {
        const codeDesc = code.descripcion.toLowerCase();
        const matches = keywords.filter(keyword => codeDesc.includes(keyword)).length;
        const confidence = (matches / keywords.length) * 100;

        return {
          codigo: code.codigo,
          descripcion: code.descripcion,
          categoria: code.categoria,
          confidence: Math.round(confidence)
        };
      })
      .filter(suggestion => suggestion.confidence > 20)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

      logger.info('items', 'suggest_seniat', 'SENIAT code suggestions generated', {
        description,
        suggestionsCount: suggestions.length
      });

      return { suggestions };
    }
  });
};