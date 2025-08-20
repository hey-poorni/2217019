export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
  userId?: string;
  action?: string;
}

export interface LoggerConfig {
  enableStorage?: boolean;
  logLevel?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enableStorage: true,
      logLevel: 'INFO',
      ...config
    };
  }

  private createLogEntry(level: LogEntry['level'], message: string, data?: any, userId?: string, action?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId,
      action
    };
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const configLevelIndex = levels.indexOf(this.config.logLevel!);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= configLevelIndex;
  }

  private storeLog(logEntry: LogEntry): void {
    if (this.config.enableStorage) {
      this.logs.push(logEntry);
      
      // Store in localStorage for persistence
      try {
        const storedLogs = localStorage.getItem('appLogs');
        const existingLogs = storedLogs ? JSON.parse(storedLogs) : [];
        const updatedLogs = [...existingLogs, logEntry];
        
        // Keep only last 1000 logs to prevent localStorage overflow
        if (updatedLogs.length > 1000) {
          updatedLogs.splice(0, updatedLogs.length - 1000);
        }
        
        localStorage.setItem('appLogs', JSON.stringify(updatedLogs));
      } catch (error) {
        // Silently fail if localStorage is not available
        // No console logging allowed
      }
    }
  }

  info(message: string, data?: any, userId?: string, action?: string): void {
    if (this.shouldLog('INFO')) {
      const logEntry = this.createLogEntry('INFO', message, data, userId, action);
      this.storeLog(logEntry);
    }
  }

  warn(message: string, data?: any, userId?: string, action?: string): void {
    if (this.shouldLog('WARN')) {
      const logEntry = this.createLogEntry('WARN', message, data, userId, action);
      this.storeLog(logEntry);
    }
  }

  error(message: string, data?: any, userId?: string, action?: string): void {
    if (this.shouldLog('ERROR')) {
      const logEntry = this.createLogEntry('ERROR', message, data, userId, action);
      this.storeLog(logEntry);
    }
  }

  debug(message: string, data?: any, userId?: string, action?: string): void {
    if (this.shouldLog('DEBUG')) {
      const logEntry = this.createLogEntry('DEBUG', message, data, userId, action);
      this.storeLog(logEntry);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByAction(action: string): LogEntry[] {
    return this.logs.filter(log => log.action === action);
  }

  clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('appLogs');
    } catch (error) {
      // Silently fail if localStorage is not available
      // No console logging allowed
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Method to display logs in the UI (for debugging purposes)
  displayLogsInUI(): LogEntry[] {
    return this.getLogs();
  }
}

// Create and export a singleton instance
export const logger = new Logger();
export default logger;
