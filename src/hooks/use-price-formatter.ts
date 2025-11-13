import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Hook para obtener la tasa BCV actual
export function useBcvRate() {
  return useQuery({
    queryKey: ['bcv-rate'],
    queryFn: async () => {
      // Simular llamada a API BCV - en producción sería la API real
      return {
        rate: 224.38, // Tasa BCV real del día de hoy
        date: '2024-11-06',
        lastUpdate: new Date().toISOString()
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
    refetchInterval: 30 * 60 * 1000, // Actualizar cada 30 minutos
  });
}

// Tipos para el formateador
interface PriceData {
  usdAmount?: number;
  vesAmount?: number;
  originalCurrency?: 'USD' | 'VES';
}

interface FormatterOptions {
  showBcvDate?: boolean;
  compact?: boolean;
  decimals?: number;
}

// Hook principal para formatear precios
export function usePriceFormatter() {
  const { data: bcvData, isLoading: bcvLoading } = useBcvRate();

  // Función para convertir VES a USD
  const vesToUsd = (vesAmount: number, rate?: number): number => {
    const currentRate = rate || bcvData?.rate || 224.38;
    return vesAmount / currentRate;
  };

  // Función para convertir USD a VES
  const usdToVes = (usdAmount: number, rate?: number): number => {
    const currentRate = rate || bcvData?.rate || 224.38;
    return usdAmount * currentRate;
  };

  // Formateador principal que muestra USD primero
  const formatPrice = (
    data: PriceData,
    options: FormatterOptions = {}
  ): string => {
    const {
      showBcvDate = true,
      compact = false,
      decimals = 2
    } = options;

    if (!data.usdAmount && !data.vesAmount) {
      return 'USD 0.00 ≈ Bs 0.00';
    }

    let usdAmount: number;
    let vesAmount: number;

    // Determinar los montos según la moneda original
    if (data.originalCurrency === 'USD' || data.usdAmount) {
      usdAmount = data.usdAmount || 0;
      vesAmount = data.vesAmount || usdToVes(usdAmount);
    } else {
      vesAmount = data.vesAmount || 0;
      usdAmount = data.usdAmount || vesToUsd(vesAmount);
    }

    // Formatear USD
    const formattedUsd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(usdAmount);

    // Formatear VES (Bolívares)
    const formattedVes = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(vesAmount);

    // Formato base
    let result = `${formattedUsd} ≈ Bs ${formattedVes}`;

    // Agregar información de tasa BCV si se solicita
    if (showBcvDate && bcvData && !compact) {
      const date = new Date(bcvData.date).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      result += ` (BCV ${date})`;
    }

    return result;
  };

  // Formateador compacto para tablas
  const formatPriceCompact = (data: PriceData): string => {
    return formatPrice(data, { compact: true, showBcvDate: false });
  };

  // Formateador para mostrar solo USD (cuando no se necesita referencia VES)
  const formatUsdOnly = (amount: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  };

  // Formateador para mostrar solo VES (cuando no se necesita referencia USD)
  const formatVesOnly = (amount: number, decimals: number = 2): string => {
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
    return `Bs ${formatted}`;
  };

  // Función para obtener el equivalente en la otra moneda
  const getEquivalent = (amount: number, fromCurrency: 'USD' | 'VES'): number => {
    if (fromCurrency === 'USD') {
      return usdToVes(amount);
    } else {
      return vesToUsd(amount);
    }
  };

  // Función para validar si un precio está actualizado (tasa no muy antigua)
  const isPriceUpToDate = (): boolean => {
    if (!bcvData) return false;

    const rateDate = new Date(bcvData.date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - rateDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 3; // Considerar actualizado si tiene menos de 3 días
  };

  return {
    formatPrice,
    formatPriceCompact,
    formatUsdOnly,
    formatVesOnly,
    vesToUsd,
    usdToVes,
    getEquivalent,
    isPriceUpToDate,
    bcvRate: bcvData?.rate || 224.38,
    bcvDate: bcvData?.date || '2024-11-06',
    isLoadingRate: bcvLoading
  };
}

// Hook específico para componentes de tabla que necesitan formato consistente
export function useTablePriceFormatter() {
  const { formatPriceCompact, formatUsdOnly, isLoadingRate } = usePriceFormatter();

  const formatTablePrice = (data: PriceData): string => {
    // Si ya viene con la estructura PriceData (desde invoices), usar directamente
    if (data.usdAmount !== undefined || data.vesAmount !== undefined) {
      return formatPriceCompact(data);
    }

    // Para compatibilidad con items (data como object genérico)
    const item = data as any;

    // Si el item tiene precio en USD, usarlo como base
    if (item.precio_usd || item.precioUsd || item.price_usd) {
      return formatPriceCompact({
        usdAmount: item.precio_usd || item.precioUsd || item.price_usd,
        vesAmount: item.precio_ves || item.precioVes || item.price_ves,
        originalCurrency: 'USD'
      });
    }

    // FIXED: Reconocer precioBase como precio USD (para datos mock)
    if (item.precioBase) {
      return formatPriceCompact({
        usdAmount: item.precioBase,
        originalCurrency: 'USD'
      });
    }

    // Si solo tiene precio en VES, convertir
    if (item.precio || item.precio_ves || item.precioVes) {
      return formatPriceCompact({
        vesAmount: item.precio || item.precio_ves || item.precioVes,
        originalCurrency: 'VES'
      });
    }

    return 'USD 0.00 ≈ Bs 0.00';
  };

  return {
    formatTablePrice,
    formatUsdOnly,
    isLoadingRate
  };
}

// Utilidades adicionales
export const PriceUtils = {
  // Función para parsear precios desde strings
  parsePrice: (priceString: string): { amount: number; currency: 'USD' | 'VES' } | null => {
    const usdMatch = priceString.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const vesMatch = priceString.match(/Bs\.?\s?(\d+(?:\.\d{3})*(?:,\d{2})?)/);

    if (usdMatch) {
      return {
        amount: parseFloat(usdMatch[1].replace(/,/g, '')),
        currency: 'USD'
      };
    }

    if (vesMatch) {
      return {
        amount: parseFloat(vesMatch[1].replace(/\./g, '').replace(',', '.')),
        currency: 'VES'
      };
    }

    return null;
  },

  // Función para validar formato de precio
  validatePriceFormat: (priceString: string): boolean => {
    const usdPattern = /^\$?\d+(?:,\d{3})*(?:\.\d{2})?$/;
    const vesPattern = /^Bs\.?\s?\d+(?:\.\d{3})*(?:,\d{2})?$/;

    return usdPattern.test(priceString) || vesPattern.test(priceString);
  }
};

export default usePriceFormatter;