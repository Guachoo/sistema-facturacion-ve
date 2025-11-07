/**
 * BCV Rate Monitoring System
 * Automatic monitoring and alerting for exchange rate changes
 */

import { rateCache, type CachedRate } from './rate-cache';
import { bcvClient } from './bcv-client';

// Monitoring configuration
const MONITOR_CONFIG = {
  // Check intervals
  NORMAL_INTERVAL: 30 * 60 * 1000, // 30 minutes
  VOLATILE_INTERVAL: 5 * 60 * 1000, // 5 minutes during volatile periods

  // Alert thresholds
  SIGNIFICANT_CHANGE: 0.05, // 5% change
  MAJOR_CHANGE: 0.10, // 10% change
  CRITICAL_CHANGE: 0.15, // 15% change

  // Volatility detection
  VOLATILITY_THRESHOLD: 3, // Number of significant changes in period
  VOLATILITY_PERIOD: 2 * 60 * 60 * 1000, // 2 hours

  // Storage key for monitoring data
  STORAGE_KEY: 'bcv_monitor_data',
};

export interface RateAlert {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  previousRate: number;
  currentRate: number;
  changePercent: number;
  source: string;
  confidence: string;
}

export interface MonitoringStatus {
  isActive: boolean;
  lastCheck: string;
  nextCheck: string;
  interval: number;
  volatilityDetected: boolean;
  alertsToday: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface MonitoringData {
  alerts: RateAlert[];
  rateChanges: Array<{
    timestamp: string;
    rate: number;
    change: number;
    source: string;
  }>;
  lastCleanup: string;
  settings: {
    enableAlerts: boolean;
    alertThreshold: number;
    maxAlertsPerDay: number;
  };
}

export class RateMonitor {
  private monitoringData: MonitoringData = {
    alerts: [],
    rateChanges: [],
    lastCleanup: '',
    settings: {
      enableAlerts: true,
      alertThreshold: MONITOR_CONFIG.SIGNIFICANT_CHANGE,
      maxAlertsPerDay: 20
    }
  };

  private isMonitoring = false;
  private currentInterval: number = MONITOR_CONFIG.NORMAL_INTERVAL;
  private monitorTimer: NodeJS.Timeout | null = null;
  private lastRate: CachedRate | null = null;

  constructor() {
    this.loadMonitoringData();
    this.cleanupOldData();
  }

  /**
   * Start automatic monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Rate monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting BCV rate monitoring...');

    this.scheduleNextCheck();
  }

  /**
   * Stop automatic monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitorTimer) {
      clearTimeout(this.monitorTimer);
      this.monitorTimer = null;
    }

    console.log('BCV rate monitoring stopped');
  }

  /**
   * Perform manual rate check
   */
  async checkRateNow(): Promise<{
    rate: CachedRate;
    alert?: RateAlert;
    volatilityDetected: boolean;
  }> {
    try {
      const currentRate = await rateCache.getCurrentRate();
      const result = {
        rate: currentRate,
        volatilityDetected: false,
        alert: undefined as RateAlert | undefined
      };

      // Compare with previous rate if available
      if (this.lastRate && this.lastRate.rate !== currentRate.rate) {
        const changePercent = Math.abs(currentRate.rate - this.lastRate.rate) / this.lastRate.rate;

        // Record rate change
        this.recordRateChange(currentRate, changePercent);

        // Check if significant change warrants an alert
        if (this.shouldCreateAlert(changePercent)) {
          const alert = this.createAlert(this.lastRate, currentRate, changePercent);
          result.alert = alert;
        }

        // Check for volatility
        result.volatilityDetected = this.detectVolatility();

        if (result.volatilityDetected) {
          this.adjustMonitoringInterval(true);
        } else {
          this.adjustMonitoringInterval(false);
        }
      }

      this.lastRate = currentRate;
      this.saveMonitoringData();

      return result;

    } catch (error) {
      console.error('Error during rate check:', error);

      // Create error alert
      const errorAlert: RateAlert = {
        id: this.generateAlertId(),
        timestamp: new Date().toISOString(),
        type: 'critical',
        title: 'Rate Monitoring Error',
        message: `Failed to check BCV rate: ${error instanceof Error ? error.message : String(error)}`,
        previousRate: this.lastRate?.rate || 0,
        currentRate: 0,
        changePercent: 0,
        source: 'monitor_error',
        confidence: 'low'
      };

      this.addAlert(errorAlert);

      return {
        rate: this.lastRate || await rateCache.getCurrentRate(),
        alert: errorAlert,
        volatilityDetected: false
      };
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): MonitoringStatus {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const alertsToday = this.monitoringData.alerts.filter(
      alert => alert.timestamp.startsWith(today)
    ).length;

    const cacheHealth = rateCache.getCacheHealthReport();

    return {
      isActive: this.isMonitoring,
      lastCheck: this.lastRate?.fetchedAt || '',
      nextCheck: this.monitorTimer ?
        new Date(Date.now() + this.currentInterval).toISOString() : '',
      interval: this.currentInterval,
      volatilityDetected: this.detectVolatility(),
      alertsToday,
      healthStatus: cacheHealth.status
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): RateAlert[] {
    return this.monitoringData.alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get rate change history
   */
  getRateChangeHistory(hours = 24): Array<{
    timestamp: string;
    rate: number;
    change: number;
    source: string;
  }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.monitoringData.rateChanges
      .filter(change => new Date(change.timestamp) > cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Update monitoring settings
   */
  updateSettings(settings: Partial<MonitoringData['settings']>): void {
    this.monitoringData.settings = {
      ...this.monitoringData.settings,
      ...settings
    };
    this.saveMonitoringData();
  }

  /**
   * Clear all monitoring data
   */
  clearData(): void {
    this.monitoringData = {
      alerts: [],
      rateChanges: [],
      lastCleanup: new Date().toISOString(),
      settings: this.monitoringData.settings // Preserve settings
    };
    this.saveMonitoringData();
  }

  // Private helper methods

  private scheduleNextCheck(): void {
    if (!this.isMonitoring) return;

    this.monitorTimer = setTimeout(async () => {
      await this.checkRateNow();
      this.scheduleNextCheck(); // Schedule next check
    }, this.currentInterval);
  }

  private shouldCreateAlert(changePercent: number): boolean {
    if (!this.monitoringData.settings.enableAlerts) {
      return false;
    }

    if (changePercent < this.monitoringData.settings.alertThreshold) {
      return false;
    }

    // Check daily alert limit
    const today = new Date().toISOString().split('T')[0];
    const alertsToday = this.monitoringData.alerts.filter(
      alert => alert.timestamp.startsWith(today)
    ).length;

    return alertsToday < this.monitoringData.settings.maxAlertsPerDay;
  }

  private createAlert(previousRate: CachedRate, currentRate: CachedRate, changePercent: number): RateAlert {
    let type: RateAlert['type'] = 'info';
    let title = 'Rate Change Detected';

    if (changePercent >= MONITOR_CONFIG.CRITICAL_CHANGE) {
      type = 'critical';
      title = 'Critical Rate Change';
    } else if (changePercent >= MONITOR_CONFIG.MAJOR_CHANGE) {
      type = 'warning';
      title = 'Major Rate Change';
    } else if (changePercent >= MONITOR_CONFIG.SIGNIFICANT_CHANGE) {
      type = 'warning';
      title = 'Significant Rate Change';
    }

    const direction = currentRate.rate > previousRate.rate ? 'increased' : 'decreased';
    const changeDescription = (changePercent * 100).toFixed(2);

    const alert: RateAlert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      type,
      title,
      message: `USD/VES rate has ${direction} by ${changeDescription}% from ${previousRate.rate.toFixed(2)} to ${currentRate.rate.toFixed(2)} VES per USD`,
      previousRate: previousRate.rate,
      currentRate: currentRate.rate,
      changePercent,
      source: currentRate.source,
      confidence: currentRate.confidence
    };

    this.addAlert(alert);
    return alert;
  }

  private recordRateChange(rate: CachedRate, changePercent: number): void {
    this.monitoringData.rateChanges.push({
      timestamp: new Date().toISOString(),
      rate: rate.rate,
      change: changePercent,
      source: rate.source
    });

    // Keep only recent changes (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.monitoringData.rateChanges = this.monitoringData.rateChanges.filter(
      change => new Date(change.timestamp) > weekAgo
    );
  }

  private detectVolatility(): boolean {
    const now = new Date();
    const volatilityPeriod = new Date(now.getTime() - MONITOR_CONFIG.VOLATILITY_PERIOD);

    const recentSignificantChanges = this.monitoringData.rateChanges.filter(
      change => new Date(change.timestamp) > volatilityPeriod &&
                 change.change >= MONITOR_CONFIG.SIGNIFICANT_CHANGE
    );

    return recentSignificantChanges.length >= MONITOR_CONFIG.VOLATILITY_THRESHOLD;
  }

  private adjustMonitoringInterval(volatileMode: boolean): void {
    const newInterval = volatileMode ?
      MONITOR_CONFIG.VOLATILE_INTERVAL :
      MONITOR_CONFIG.NORMAL_INTERVAL;

    if (newInterval !== this.currentInterval) {
      this.currentInterval = newInterval;
      console.log(`Monitoring interval adjusted to ${newInterval / 1000}s (volatile: ${volatileMode})`);

      // Restart monitoring with new interval
      if (this.isMonitoring) {
        if (this.monitorTimer) {
          clearTimeout(this.monitorTimer);
        }
        this.scheduleNextCheck();
      }
    }
  }

  private addAlert(alert: RateAlert): void {
    this.monitoringData.alerts.push(alert);
    console.log(`Rate alert created: ${alert.title} - ${alert.message}`);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldData(): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Clean old alerts
    this.monitoringData.alerts = this.monitoringData.alerts.filter(
      alert => new Date(alert.timestamp) > thirtyDaysAgo
    );

    // Clean old rate changes
    this.monitoringData.rateChanges = this.monitoringData.rateChanges.filter(
      change => new Date(change.timestamp) > thirtyDaysAgo
    );

    this.monitoringData.lastCleanup = now.toISOString();
  }

  private loadMonitoringData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(MONITOR_CONFIG.STORAGE_KEY);
        if (data) {
          this.monitoringData = { ...this.monitoringData, ...JSON.parse(data) };
        }
      }
    } catch (error) {
      console.warn('Failed to load monitoring data:', error);
    }
  }

  private saveMonitoringData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MONITOR_CONFIG.STORAGE_KEY, JSON.stringify(this.monitoringData));
      }
    } catch (error) {
      console.warn('Failed to save monitoring data:', error);
    }
  }
}

// Export singleton instance
export const rateMonitor = new RateMonitor();

// Helper functions for easy access
export const startRateMonitoring = (): void => {
  rateMonitor.startMonitoring();
};

export const stopRateMonitoring = (): void => {
  rateMonitor.stopMonitoring();
};

export const getMonitoringStatus = (): MonitoringStatus => {
  return rateMonitor.getMonitoringStatus();
};

export const getRecentRateAlerts = (limit?: number): RateAlert[] => {
  return rateMonitor.getRecentAlerts(limit);
};