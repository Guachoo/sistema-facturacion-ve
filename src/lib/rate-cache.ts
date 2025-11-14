/**
 * BCV Rate Caching System
 * Provides intelligent caching and fallback mechanisms for exchange rates
 */

import type { BcvRate } from '@/types';
import { bcvClient, type BcvApiResponse } from './bcv-client';

// Cache configuration
const CACHE_CONFIG = {
  // Cache duration in milliseconds
  FRESH_DURATION: 30 * 60 * 1000, // 30 minutes
  STALE_DURATION: 6 * 60 * 60 * 1000, // 6 hours
  EMERGENCY_DURATION: 24 * 60 * 60 * 1000, // 24 hours

  // Storage keys
  STORAGE_KEY_CURRENT: 'bcv_rate_current',
  STORAGE_KEY_BACKUP: 'bcv_rate_backup',
  STORAGE_KEY_METADATA: 'bcv_rate_metadata',

  // Default fallback rate (conservative estimate)
  FALLBACK_RATE: 234.50,
};

export interface CachedRate extends BcvRate {
  cachedAt: string;
  fetchedAt: string;
  attempts: number;
  confidence: 'high' | 'medium' | 'low' | 'fallback';
}

export interface CacheMetadata {
  lastSuccessfulFetch: string;
  consecutiveFailures: number;
  averageRate24h: number;
  rateHistory: Array<{ rate: number; timestamp: string }>;
  sourceReliability: Record<string, number>;
}

export class RateCache {
  private cache: Map<string, CachedRate> = new Map();
  private metadata: CacheMetadata = {
    lastSuccessfulFetch: '',
    consecutiveFailures: 0,
    averageRate24h: 0,
    rateHistory: [],
    sourceReliability: {}
  };

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get current exchange rate with intelligent caching
   */
  async getCurrentRate(forceRefresh = false): Promise<CachedRate> {
    const now = new Date();
    const cacheKey = this.generateCacheKey(now);

    // Check if we have a fresh cached rate
    if (!forceRefresh) {
      const cachedRate = this.getCachedRate(cacheKey);
      if (cachedRate && this.isRateFresh(cachedRate, now)) {
        return cachedRate;
      }
    }

    // Try to fetch new rate
    try {
      const response = await bcvClient.getCurrentRate();

      if (response.success && bcvClient.isValidRate(response.rate)) {
        const cachedRate = this.storeFreshRate(response, now);
        this.updateMetadata(response, true);
        this.saveToStorage();
        return cachedRate;
      } else {
        throw new Error(response.error || 'Invalid rate received');
      }

    } catch (error) {
      console.warn('Failed to fetch fresh rate:', error);
      this.updateMetadata(null, false);

      // Try to return stale but usable cached rate
      const staleRate = this.getStaleRate(now);
      if (staleRate) {
        return {
          ...staleRate,
          confidence: 'medium'
        };
      }

      // Return emergency fallback rate
      return this.getEmergencyFallbackRate(now);
    }
  }

  /**
   * Get rate for a specific date
   */
  async getRateForDate(date: string): Promise<CachedRate> {
    const cacheKey = `historical_${date}`;
    const cached = this.cache.get(cacheKey);

    if (cached && this.isHistoricalRateValid(cached)) {
      return cached;
    }

    try {
      const response = await bcvClient.getHistoricalRate(date);

      if (response.success) {
        const cachedRate: CachedRate = {
          rate: response.rate,
          date: response.date,
          lastUpdate: response.lastUpdate,
          source: response.source,
          cachedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          attempts: 1,
          confidence: 'high'
        };

        this.cache.set(cacheKey, cachedRate);
        this.saveToStorage();
        return cachedRate;
      }
    } catch (error) {
      console.warn(`Failed to fetch historical rate for ${date}:`, error);
    }

    // Return interpolated rate based on current rate
    const currentRate = await this.getCurrentRate();
    return {
      ...currentRate,
      date,
      confidence: 'low',
      source: 'interpolated'
    };
  }

  /**
   * Get multiple rates with batch optimization
   */
  async getBatchRates(dates: string[]): Promise<Record<string, CachedRate>> {
    const results: Record<string, CachedRate> = {};

    // Process in parallel for better performance
    const promises = dates.map(async (date) => {
      try {
        const rate = await this.getRateForDate(date);
        return { date, rate };
      } catch (error) {
        console.warn(`Failed to get rate for ${date}:`, error);
        return null;
      }
    });

    const settled = await Promise.allSettled(promises);

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results[result.value.date] = result.value.rate;
      }
    });

    return results;
  }

  /**
   * Check cache health and return diagnostics
   */
  getCacheHealthReport(): {
    status: 'healthy' | 'degraded' | 'critical';
    currentRate: CachedRate | null;
    lastSuccessful: string;
    consecutiveFailures: number;
    cacheSize: number;
    recommendations: string[];
  } {
    const now = new Date();
    const currentRate = this.getCachedRate(this.generateCacheKey(now));
    const recommendations: string[] = [];

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check consecutive failures
    if (this.metadata.consecutiveFailures > 5) {
      status = 'critical';
      recommendations.push('Multiple consecutive API failures - check connectivity');
    } else if (this.metadata.consecutiveFailures > 2) {
      status = 'degraded';
      recommendations.push('Some API failures detected - monitor connectivity');
    }

    // Check rate freshness
    if (currentRate) {
      const ageMs = now.getTime() - new Date(currentRate.cachedAt).getTime();
      if (ageMs > CACHE_CONFIG.STALE_DURATION) {
        status = status === 'critical' ? 'critical' : 'degraded';
        recommendations.push('Cached rate is stale - refresh recommended');
      }
    } else {
      status = 'critical';
      recommendations.push('No cached rate available - immediate refresh required');
    }

    // Check cache size
    if (this.cache.size > 1000) {
      recommendations.push('Cache size is large - consider cleanup');
    }

    return {
      status,
      currentRate,
      lastSuccessful: this.metadata.lastSuccessfulFetch,
      consecutiveFailures: this.metadata.consecutiveFailures,
      cacheSize: this.cache.size,
      recommendations
    };
  }

  /**
   * Force refresh of current rate
   */
  async forceRefresh(): Promise<CachedRate> {
    return this.getCurrentRate(true);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.metadata = {
      lastSuccessfulFetch: '',
      consecutiveFailures: 0,
      averageRate24h: 0,
      rateHistory: [],
      sourceReliability: {}
    };
    this.clearStorage();
  }

  // Private helper methods

  private generateCacheKey(date: Date): string {
    return `current_${date.toISOString().split('T')[0]}`;
  }

  private getCachedRate(cacheKey: string): CachedRate | null {
    return this.cache.get(cacheKey) || null;
  }

  private isRateFresh(rate: CachedRate, now: Date): boolean {
    const ageMs = now.getTime() - new Date(rate.cachedAt).getTime();
    return ageMs < CACHE_CONFIG.FRESH_DURATION;
  }

  private isHistoricalRateValid(rate: CachedRate): boolean {
    const ageMs = Date.now() - new Date(rate.cachedAt).getTime();
    return ageMs < CACHE_CONFIG.EMERGENCY_DURATION; // Historical rates are valid longer
  }

  private getStaleRate(now: Date): CachedRate | null {
    // Look for any cached rate within the stale duration
    const staleThreshold = now.getTime() - CACHE_CONFIG.STALE_DURATION;

    for (const rate of this.cache.values()) {
      const rateAge = new Date(rate.cachedAt).getTime();
      if (rateAge > staleThreshold) {
        return rate;
      }
    }

    return null;
  }

  private getEmergencyFallbackRate(now: Date): CachedRate {
    // Calculate fallback based on recent history if available
    let fallbackRate = CACHE_CONFIG.FALLBACK_RATE;

    if (this.metadata.averageRate24h > 0) {
      fallbackRate = this.metadata.averageRate24h;
    } else if (this.metadata.rateHistory.length > 0) {
      const recent = this.metadata.rateHistory.slice(-5);
      fallbackRate = recent.reduce((sum, h) => sum + h.rate, 0) / recent.length;
    }

    return {
      rate: fallbackRate,
      date: now.toISOString().split('T')[0],
      lastUpdate: now.toISOString(),
      source: 'emergency_fallback',
      cachedAt: now.toISOString(),
      fetchedAt: now.toISOString(),
      attempts: 0,
      confidence: 'fallback'
    };
  }

  private storeFreshRate(response: BcvApiResponse, now: Date): CachedRate {
    const cacheKey = this.generateCacheKey(now);

    const cachedRate: CachedRate = {
      rate: response.rate,
      date: response.date,
      lastUpdate: response.lastUpdate || now.toISOString(),
      source: response.source,
      cachedAt: now.toISOString(),
      fetchedAt: now.toISOString(),
      attempts: 1,
      confidence: 'high'
    };

    this.cache.set(cacheKey, cachedRate);
    return cachedRate;
  }

  private updateMetadata(response: BcvApiResponse | null, success: boolean): void {
    const now = new Date();

    if (success && response) {
      this.metadata.lastSuccessfulFetch = now.toISOString();
      this.metadata.consecutiveFailures = 0;

      // Update rate history
      this.metadata.rateHistory.push({
        rate: response.rate,
        timestamp: now.toISOString()
      });

      // Keep only last 24 hours of history
      const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
      this.metadata.rateHistory = this.metadata.rateHistory.filter(
        h => new Date(h.timestamp).getTime() > dayAgo
      );

      // Calculate 24h average
      if (this.metadata.rateHistory.length > 0) {
        this.metadata.averageRate24h = this.metadata.rateHistory.reduce((sum, h) => sum + h.rate, 0) / this.metadata.rateHistory.length;
      }

      // Update source reliability
      if (!this.metadata.sourceReliability[response.source]) {
        this.metadata.sourceReliability[response.source] = 0;
      }
      this.metadata.sourceReliability[response.source]++;

    } else {
      this.metadata.consecutiveFailures++;
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const currentData = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY_CURRENT);
        const metadataData = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY_METADATA);

        if (currentData) {
          const parsed = JSON.parse(currentData);
          Object.entries(parsed).forEach(([key, value]) => {
            this.cache.set(key, value as CachedRate);
          });
        }

        if (metadataData) {
          this.metadata = { ...this.metadata, ...JSON.parse(metadataData) };
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const cacheData = Object.fromEntries(this.cache.entries());
        localStorage.setItem(CACHE_CONFIG.STORAGE_KEY_CURRENT, JSON.stringify(cacheData));
        localStorage.setItem(CACHE_CONFIG.STORAGE_KEY_METADATA, JSON.stringify(this.metadata));
      }
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private clearStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY_CURRENT);
        localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY_BACKUP);
        localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY_METADATA);
      }
    } catch (error) {
      console.warn('Failed to clear cache storage:', error);
    }
  }
}

// Export singleton instance
export const rateCache = new RateCache();

// Helper functions for easy access
export const getCurrentBcvRate = async (forceRefresh = false): Promise<CachedRate> => {
  return rateCache.getCurrentRate(forceRefresh);
};

export const getBcvRateForDate = async (date: string): Promise<CachedRate> => {
  return rateCache.getRateForDate(date);
};

export const getBcvCacheHealth = () => {
  return rateCache.getCacheHealthReport();
};