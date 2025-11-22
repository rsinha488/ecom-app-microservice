/**
 * Environment-Aware Logging Utility
 *
 * Provides structured logging with different levels and environment awareness.
 * In production, limits console output to errors only.
 * Supports integration with external logging services (Sentry, LogRocket, etc.)
 *
 * @module utils/logger
 * @example
 * import { logger } from '@/utils/logger';
 *
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 * logger.error('Payment failed', { error, orderId: '456' });
 * logger.debug('API request', { url: '/api/products', method: 'GET' });
 */

/**
 * Log levels enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  /** Minimum log level to output (defaults to INFO in production, DEBUG in development) */
  minLevel: LogLevel;
  /** Whether to enable console output */
  enableConsole: boolean;
  /** Whether to send logs to external service */
  enableRemote: boolean;
  /** Application context for log enrichment */
  context?: Record<string, any>;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Logger class for structured logging
 */
class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.config = {
      minLevel: isProduction ? LogLevel.ERROR : LogLevel.DEBUG,
      enableConsole: !isProduction,
      enableRemote: isProduction,
      ...config,
    };
  }

  /**
   * Log a debug message (development only)
   *
   * @param message - Log message
   * @param data - Optional data to include
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an informational message
   *
   * @param message - Log message
   * @param data - Optional data to include
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   *
   * @param message - Log message
   * @param data - Optional data to include
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   *
   * @param message - Log message
   * @param error - Error object or data
   */
  error(message: string, error?: Error | any): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const data = error instanceof Error ? { name: error.name, message: error.message } : error;

    this.log(LogLevel.ERROR, message, data, stack);
  }

  /**
   * Internal logging method
   *
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data
   * @param stack - Optional stack trace
   */
  private log(level: LogLevel, message: string, data?: any, stack?: string): void {
    // Check if log level meets minimum threshold
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: this.config.context,
      stack,
    };

    // Console output (development)
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Remote logging (production)
    if (this.config.enableRemote) {
      this.logToRemote(entry);
    }
  }

  /**
   * Output log to console with appropriate formatting
   *
   * @param entry - Log entry
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, data, stack } = entry;
    const formattedTime = new Date(timestamp).toLocaleTimeString();

    // Color codes for different log levels
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const resetColor = '\x1b[0m';

    const prefix = `${colors[level]}[${level.toUpperCase()}]${resetColor} ${formattedTime}`;
    const formattedMessage = `${prefix} ${message}`;

    // Use appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '');
        if (stack) {
          console.error(stack);
        }
        break;
    }
  }

  /**
   * Send log to remote logging service
   *
   * Integrate with services like Sentry, LogRocket, Datadog, etc.
   *
   * @param entry - Log entry
   */
  private logToRemote(entry: LogEntry): void {
    // Only log errors and warnings to remote service to reduce noise
    if (entry.level !== LogLevel.ERROR && entry.level !== LogLevel.WARN) {
      return;
    }

    // Example: Integration with Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      if (entry.level === LogLevel.ERROR) {
        (window as any).Sentry.captureException(
          new Error(entry.message),
          {
            level: 'error',
            extra: {
              data: entry.data,
              context: entry.context,
            },
          }
        );
      } else if (entry.level === LogLevel.WARN) {
        (window as any).Sentry.captureMessage(entry.message, {
          level: 'warning',
          extra: {
            data: entry.data,
            context: entry.context,
          },
        });
      }
    }

    // Example: Send to custom logging endpoint
    // Note: Use navigator.sendBeacon for non-blocking requests
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const logEndpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT;
      if (logEndpoint) {
        navigator.sendBeacon(
          logEndpoint,
          JSON.stringify({
            ...entry,
            userAgent: navigator.userAgent,
            url: window.location.href,
          })
        );
      }
    }
  }

  /**
   * Create a child logger with additional context
   *
   * @param context - Additional context to merge
   * @returns New logger instance with merged context
   */
  child(context: Record<string, any>): Logger {
    return new Logger({
      ...this.config,
      context: {
        ...this.config.context,
        ...context,
      },
    });
  }

  /**
   * Set global context for all logs
   *
   * @param context - Context to set
   */
  setContext(context: Record<string, any>): void {
    this.config.context = {
      ...this.config.context,
      ...context,
    };
  }
}

/**
 * Global logger instance
 *
 * Use this throughout your application for consistent logging.
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 *
 * Useful for component or module-specific logging.
 *
 * @param context - Context to attach to logger
 * @returns Logger instance with context
 *
 * @example
 * const authLogger = createLogger({ module: 'auth' });
 * authLogger.info('User logged in', { userId: '123' });
 */
export function createLogger(context: Record<string, any>): Logger {
  return logger.child(context);
}

/**
 * Default export
 */
export default logger;
