/**
 * Sistema de Historial de Tasas BCV
 * Guarda y gestiona el historial diario de tasas de cambio
 */

import type { BcvRate } from '@/types';

export interface RateHistoryEntry {
  date: string;
  rate: number;
  source: string;
  timestamp: string;
  weekday: string;
}

export interface RateAnalytics {
  currentRate: number;
  weeklyAverage: number;
  monthlyAverage: number;
  weeklyChange: number;
  monthlyChange: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
  highestRate: RateHistoryEntry;
  lowestRate: RateHistoryEntry;
  dailyVariation: {
    percentage: number;
    isPositive: boolean;
  };
}

// Storage key para el historial
const STORAGE_KEY = 'bcv_rates_history';
const MAX_HISTORY_DAYS = 365; // Mantener 1 año de historial

export class RateHistoryManager {

  /**
   * Guardar nueva tasa en el historial
   */
  static saveRate(rate: BcvRate): void {
    try {
      const history = this.getHistory();
      const today = new Date().toISOString().split('T')[0];

      // Verificar si ya existe una entrada para hoy
      const existingIndex = history.findIndex(entry => entry.date === today);

      const newEntry: RateHistoryEntry = {
        date: today,
        rate: rate.rate,
        source: rate.source || 'Unknown',
        timestamp: new Date().toISOString(),
        weekday: new Date().toLocaleDateString('es-ES', { weekday: 'long' })
      };

      if (existingIndex >= 0) {
        // Actualizar entrada existente
        history[existingIndex] = newEntry;
        console.log(`📊 Tasa BCV actualizada para hoy: ${rate.rate} Bs`);
      } else {
        // Agregar nueva entrada
        history.unshift(newEntry);
        console.log(`📊 Nueva tasa BCV guardada: ${rate.rate} Bs`);
      }

      // Mantener solo los últimos MAX_HISTORY_DAYS
      const trimmedHistory = history.slice(0, MAX_HISTORY_DAYS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

    } catch (error) {
      console.error('Error saving rate to history:', error);
    }
  }

  /**
   * Obtener historial completo
   */
  static getHistory(): RateHistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      return JSON.parse(stored) as RateHistoryEntry[];
    } catch (error) {
      console.error('Error loading rate history:', error);
      return [];
    }
  }

  /**
   * Obtener historial de los últimos N días
   */
  static getRecentHistory(days: number = 30): RateHistoryEntry[] {
    return this.getHistory().slice(0, days);
  }

  /**
   * Calcular análisis de tasas
   */
  static calculateAnalytics(): RateAnalytics | null {
    const history = this.getHistory();

    if (history.length === 0) {
      return null;
    }

    const currentRate = history[0]?.rate || 0;

    // Calcular promedios
    const last7Days = history.slice(0, 7);
    const last30Days = history.slice(0, 30);

    const weeklyAverage = last7Days.length > 0
      ? last7Days.reduce((sum, entry) => sum + entry.rate, 0) / last7Days.length
      : currentRate;

    const monthlyAverage = last30Days.length > 0
      ? last30Days.reduce((sum, entry) => sum + entry.rate, 0) / last30Days.length
      : currentRate;

    // Calcular cambios porcentuales
    const weeklyChange = last7Days.length >= 2
      ? ((currentRate - last7Days[last7Days.length - 1].rate) / last7Days[last7Days.length - 1].rate) * 100
      : 0;

    const monthlyChange = last30Days.length >= 2
      ? ((currentRate - last30Days[last30Days.length - 1].rate) / last30Days[last30Days.length - 1].rate) * 100
      : 0;

    // Calcular volatilidad (desviación estándar)
    const rates = last30Days.map(entry => entry.rate);
    const mean = monthlyAverage;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    const volatility = Math.sqrt(variance);

    // Determinar tendencia
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (weeklyChange > 2) trend = 'up';
    else if (weeklyChange < -2) trend = 'down';

    // Encontrar máximos y mínimos
    const sortedByRate = [...history].sort((a, b) => b.rate - a.rate);
    const highestRate = sortedByRate[0];
    const lowestRate = sortedByRate[sortedByRate.length - 1];

    // Calcular variación diaria
    const dailyChange = history.length >= 2
      ? ((currentRate - history[1].rate) / history[1].rate) * 100
      : 0;

    return {
      currentRate,
      weeklyAverage: Number(weeklyAverage.toFixed(2)),
      monthlyAverage: Number(monthlyAverage.toFixed(2)),
      weeklyChange: Number(weeklyChange.toFixed(2)),
      monthlyChange: Number(monthlyChange.toFixed(2)),
      volatility: Number(volatility.toFixed(2)),
      trend,
      highestRate,
      lowestRate,
      dailyVariation: {
        percentage: Number(dailyChange.toFixed(2)),
        isPositive: dailyChange > 0
      }
    };
  }

  /**
   * Limpiar historial antiguo
   */
  static clearOldHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('📊 Historial de tasas BCV limpiado');
    } catch (error) {
      console.error('Error clearing rate history:', error);
    }
  }

  /**
   * Inicializar con datos de ejemplo para desarrollo
   */
  static initializeWithSampleData(): void {
    const history = this.getHistory();

    // Solo inicializar si no hay datos
    if (history.length === 0) {
      const sampleData: RateHistoryEntry[] = [
        {
          date: '2024-11-14',
          rate: 234.50,
          source: 'Manual Update',
          timestamp: new Date().toISOString(),
          weekday: 'jueves'
        },
        {
          date: '2024-11-13',
          rate: 233.85,
          source: 'DolarAPI',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          weekday: 'miércoles'
        },
        {
          date: '2024-11-12',
          rate: 232.40,
          source: 'DolarAPI',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          weekday: 'martes'
        },
        {
          date: '2024-11-11',
          rate: 231.95,
          source: 'ExchangeRate Host',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          weekday: 'lunes'
        }
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
      console.log('📊 Historial de tasas inicializado con datos de ejemplo');
    }
  }

  /**
   * Exportar historial como CSV
   */
  static exportToCsv(): string {
    const history = this.getHistory();

    const headers = ['Fecha', 'Tasa (Bs)', 'Fuente', 'Día de la Semana'];
    const csvContent = [
      headers.join(','),
      ...history.map(entry => [
        entry.date,
        entry.rate.toString(),
        entry.source,
        entry.weekday
      ].join(','))
    ].join('\n');

    return csvContent;
  }
}