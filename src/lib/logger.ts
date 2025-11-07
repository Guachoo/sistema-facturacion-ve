// Enhanced logging and auditing system for Venezuelan invoicing
import { fiscalDocumentHelpers } from './supabase';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private sessionId = crypto.randomUUID();

  private formatLogEntry(level: LogLevel, module: string, action: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      action,
      message,
      data,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      return user?.id;
    } catch {
      return undefined;
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.isDevelopment && entry.level === 'debug') return;

    const color = {
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      debug: '\x1b[90m'    // gray
    }[entry.level];

    const reset = '\x1b[0m';
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`;

    console.log(
      `${prefix} ${entry.timestamp} - ${entry.module}:${entry.action}`,
      entry.message,
      entry.data ? entry.data : ''
    );
  }

  private async persistToDatabase(entry: LogEntry): Promise<void> {
    try {
      // Only persist important logs to avoid database bloat
      if (entry.level === 'info' && !entry.action.includes('fiscal')) return;

      // Store in local storage for now, implement database persistence later
      const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      logs.push(entry);

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      localStorage.setItem('audit_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to persist log entry:', error);
    }
  }

  info(module: string, action: string, message: string, data?: any): void {
    const entry = this.formatLogEntry('info', module, action, message, data);
    this.writeToConsole(entry);
    this.persistToDatabase(entry);
  }

  warn(module: string, action: string, message: string, data?: any): void {
    const entry = this.formatLogEntry('warn', module, action, message, data);
    this.writeToConsole(entry);
    this.persistToDatabase(entry);
  }

  error(module: string, action: string, message: string, error?: any): void {
    const entry = this.formatLogEntry('error', module, action, message, {
      error: error?.message || error,
      stack: error?.stack,
      ...(error?.response && {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
    });
    this.writeToConsole(entry);
    this.persistToDatabase(entry);
  }

  debug(module: string, action: string, message: string, data?: any): void {
    const entry = this.formatLogEntry('debug', module, action, message, data);
    this.writeToConsole(entry);
  }

  // Fiscal-specific logging methods
  async logFiscalDocument(action: string, documentId: string, data: any, result?: any, error?: any): Promise<void> {
    const status = error ? 'error' : 'success';
    const message = error ? `Fiscal document ${action} failed` : `Fiscal document ${action} successful`;

    this.info('fiscal', action, message, {
      documentId,
      requestData: data,
      responseData: result,
      error: error?.message
    });

    // Also log to TFHKA audit table
    try {
      await fiscalDocumentHelpers.logTfhkaAction({
        document_id: documentId,
        action: action as any,
        request_data: data,
        response_data: result || null,
        status,
        error_message: error?.message
      });
    } catch (logError) {
      this.error('fiscal', 'audit_log', 'Failed to log TFHKA action', logError);
    }
  }

  async logTfhkaApiCall(endpoint: string, method: string, requestData: any, responseData?: any, error?: any): Promise<void> {
    const status = error ? 'error' : 'success';
    const message = `TFHKA API ${method} ${endpoint} ${status}`;

    this.info('tfhka', 'api_call', message, {
      endpoint,
      method,
      requestData,
      responseData,
      error: error?.message,
      status: error?.response?.status
    });
  }

  // User action logging
  logUserAction(action: string, module: string, details?: any): void {
    this.info('user', action, `User performed ${action} in ${module}`, details);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, details?: any): void {
    if (duration > 1000) {
      this.warn('performance', operation, `Slow operation detected: ${duration}ms`, details);
    } else {
      this.debug('performance', operation, `Operation completed in ${duration}ms`, details);
    }
  }

  // Security logging
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details?: any): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this[level]('security', event, `Security event: ${event}`, details);
  }

  // Get recent logs
  getRecentLogs(limit: number = 50): LogEntry[] {
    try {
      const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      return logs.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  // Clear old logs
  clearOldLogs(olderThanDays: number = 30): void {
    try {
      const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const filteredLogs = logs.filter((log: LogEntry) =>
        new Date(log.timestamp) > cutoffDate
      );

      localStorage.setItem('audit_logs', JSON.stringify(filteredLogs));
      this.info('logger', 'cleanup', `Cleared logs older than ${olderThanDays} days`);
    } catch (error) {
      this.error('logger', 'cleanup', 'Failed to clear old logs', error);
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Performance measurement utility
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  details?: any
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      logger.logPerformance(operation, duration, details);
      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.logPerformance(operation, duration, { ...details, error: true });
      reject(error);
    }
  });
}

// Error boundary logging
export function logError(error: Error, context?: string): void {
  logger.error('app', 'error_boundary', `Unhandled error${context ? ` in ${context}` : ''}`, error);
}

export default logger;