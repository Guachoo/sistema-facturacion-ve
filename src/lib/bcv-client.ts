/**
 * BCV (Banco Central de Venezuela) API Client with CORS Support
 * Fetches real exchange rates from CORS-enabled sources
 */

import axios from 'axios';
import type { BcvRate } from '@/types';

// BCV API configuration - Using CORS-enabled APIs
const BCV_CONFIG = {
  // Venezuela DolarAPI - Real rates from Venezuelan sources
  PRIMARY_SOURCES: [
    {
      name: 'DolarAPI Venezuela BCV (CORS Proxy)',
      url: 'https://api.allorigins.win/get?url=https://ve.dolarapi.com/v1/dolares',
      parser: 'dolarapi_proxy'
    },
    {
      name: 'ExchangeRate Host',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=VES',
      parser: 'exchangehost'
    },
    {
      name: 'Manual BCV Rate (Fallback: 234.50)',
      url: '',
      parser: 'manual'
    }
  ],

  // Fallback sources (empty for now, using manual rate as fallback)
  FALLBACK_SOURCES: [],

  // Manual rate configuration (backup if API fails)
  MANUAL_RATE: {
    rate: 234.50, // ← Actualizado con tasa BCV real del 13-Nov-2024
    lastUpdate: '2024-11-13',
    source: 'BCV Manual Update'
  },

  // Request timeout
  TIMEOUT: 10000, // 10 seconds

  // Headers for CORS
  HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

export interface BcvApiResponse extends BcvRate {
  success: boolean;
  error?: string;
}

export class BcvClient {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: BCV_CONFIG.TIMEOUT,
      headers: {
        ...BCV_CONFIG.HEADERS,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // Clear any cached data on initialization
    this.clearCache();
  }

  private clearCache() {
    try {
      // Clear any localStorage related to BCV rates
      localStorage.removeItem('bcv_rate_current');
      localStorage.removeItem('bcv_rate_backup');
      localStorage.removeItem('bcv_rate_metadata');
      localStorage.removeItem('cached_bcv_rate');
      console.log('🧹 BCV cache cleared - using new APIs');
    } catch (error) {
      console.warn('Could not clear cache:', error);
    }
  }

  /**
   * Fetch current USD/VES exchange rate from CORS-enabled sources
   */
  async getCurrentRate(): Promise<BcvApiResponse> {
    // Try primary sources first
    for (const source of BCV_CONFIG.PRIMARY_SOURCES) {
      try {
        const result = await this.fetchFromSource(source);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`${source.name} failed:`, error);
      }
    }

    // If all primary sources fail, use fallback
    return this.getFallbackRate();
  }

  /**
   * Fetch rate from a specific source
   */
  private async fetchFromSource(source: { name: string; url: string; parser: string }): Promise<BcvApiResponse> {
    try {
      if (source.parser === 'fallback') {
        return this.getFallbackRate();
      }

      if (source.parser === 'manual') {
        // Return manual rate directly without API call
        return {
          success: true,
          rate: BCV_CONFIG.MANUAL_RATE.rate,
          date: new Date().toISOString().split('T')[0],
          source: BCV_CONFIG.MANUAL_RATE.source,
          lastUpdate: new Date().toISOString()
        };
      }

      // Use clean axios instance for proxy requests to avoid header conflicts
      if (source.parser === 'dolarapi_proxy') {
        const cleanResponse = await axios.get(source.url, {
          timeout: BCV_CONFIG.TIMEOUT,
          headers: {
            'Accept': 'application/json'
          }
        });
        return this.parseResponse(cleanResponse.data, source);
      }

      const response = await this.axiosInstance.get(source.url);
      return this.parseResponse(response.data, source);

    } catch (error) {
      return {
        success: false,
        rate: 0,
        date: new Date().toISOString().split('T')[0],
        source: source.name,
        error: `${source.name} error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Parse response based on source type
   */
  private parseResponse(data: any, source: { name: string; parser: string }): BcvApiResponse {
    const currentDate = new Date().toISOString().split('T')[0];

    try {
      let rate = 0;

      switch (source.parser) {
        case 'exchangehost':
          // ExchangeRate Host format: { rates: { VES: number } }
          rate = data?.rates?.VES || 0;
          break;

        case 'dolarapi_proxy':
          // AllOrigins proxy format: { contents: "[{...}]" }
          try {
            const apiData = JSON.parse(data?.contents || '[]');
            const oficialRate = apiData?.find((item: any) => item.fuente === 'oficial');
            rate = oficialRate?.promedio || 0;
          } catch (error) {
            console.warn('Failed to parse DolarAPI proxy response:', error);
            rate = 0;
          }
          break;

        case 'dolarapi':
          // DolarAPI Venezuela format: [{"fuente": "oficial", "promedio": 224.3762}]
          const oficialRate = data?.find((item: any) => item.fuente === 'oficial');
          rate = oficialRate?.promedio || 0;
          break;

        case 'freeforex':
          // Free Forex API format: { rates: { USDVES: { rate: number } } }
          rate = data?.rates?.USDVES?.rate || 0;
          break;

        case 'manual':
          // Manual rate from configuration
          rate = BCV_CONFIG.MANUAL_RATE.rate;
          break;

        default:
          throw new Error('Unknown parser type');
      }

      if (rate && rate > 0 && this.isValidRate(rate)) {
        return {
          success: true,
          rate,
          date: currentDate,
          source: source.name,
          lastUpdate: new Date().toISOString()
        };
      }

      throw new Error('Invalid rate received');

    } catch (error) {
      return {
        success: false,
        rate: 0,
        date: currentDate,
        source: source.name,
        error: `Parse error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get historical rate for a specific date
   */
  async getHistoricalRate(date: string): Promise<BcvApiResponse> {
    try {
      // Most free APIs don't support historical data
      // Return current rate with note
      const currentRate = await this.getCurrentRate();

      return {
        ...currentRate,
        date,
        error: currentRate.error || 'Historical rates not available in free tier - using current rate'
      };

    } catch (error) {
      return {
        success: false,
        rate: 0,
        date,
        source: 'historical',
        error: `Historical rate error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Fallback rate when all APIs fail
   */
  private getFallbackRate(): BcvApiResponse {
    // Use manual rate from configuration
    return {
      success: true,
      rate: BCV_CONFIG.MANUAL_RATE.rate,
      date: new Date().toISOString().split('T')[0],
      source: BCV_CONFIG.MANUAL_RATE.source,
      lastUpdate: new Date().toISOString(),
      error: 'Using manual rate configuration'
    };
  }

  /**
   * Validate if a rate seems reasonable
   */
  isValidRate(rate: number): boolean {
    // Venezuelan bolívar rates should be within reasonable bounds
    // As of November 2024, rates are typically between 200-400 VES per USD
    return rate > 50 && rate < 500;
  }

  /**
   * Test connectivity to exchange rate sources
   */
  async testConnectivity(): Promise<{
    primary: boolean;
    fallback: boolean;
    overall: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let primaryWorking = false;
    let fallbackWorking = false;

    // Test primary sources
    for (const source of BCV_CONFIG.PRIMARY_SOURCES) {
      try {
        const result = await this.fetchFromSource(source);
        if (result.success) {
          primaryWorking = true;
          details.push(`✅ ${source.name}: Working`);
          break;
        } else {
          details.push(`❌ ${source.name}: ${result.error}`);
        }
      } catch (error) {
        details.push(`❌ ${source.name}: Connection failed`);
      }
    }

    // Test fallback
    try {
      const fallback = this.getFallbackRate();
      if (fallback.success) {
        fallbackWorking = true;
        details.push(`✅ Fallback: Available`);
      }
    } catch (error) {
      details.push(`❌ Fallback: Failed`);
    }

    return {
      primary: primaryWorking,
      fallback: fallbackWorking,
      overall: primaryWorking || fallbackWorking,
      details
    };
  }
}

// Export singleton instance
export const bcvClient = new BcvClient();
export default bcvClient;