/**
 * 日志工具类
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private formatMessage(level: string, module: string, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private stringToLogLevel(level: string): LogLevel {
    switch (level) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private log(entry: LogEntry): void {
    // 将日志级别字符串转换为枚举值
    const entryLogLevel = this.stringToLogLevel(entry.level);

    // 只有当日志级别符合要求时才记录
    if (!this.shouldLog(entryLogLevel)) {
      return;
    }

    this.logs.push(entry);

    const levelStr = `[${entry.level}]`;
    const moduleStr = `[${entry.module}]`;
    const messageStr = `${entry.timestamp} ${levelStr} ${moduleStr} ${entry.message}`;

    switch (entry.level) {
      case 'DEBUG':
        console.log(`\x1b[36m${messageStr}\x1b[0m`, entry.data || '');
        break;
      case 'INFO':
        console.log(`\x1b[32m${messageStr}\x1b[0m`, entry.data || '');
        break;
      case 'WARN':
        console.warn(`\x1b[33m${messageStr}\x1b[0m`, entry.data || '');
        break;
      case 'ERROR':
        console.error(`\x1b[31m${messageStr}\x1b[0m`, entry.data || '');
        break;
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    const entry = this.formatMessage('DEBUG', module, message, data);
    this.log(entry);
  }

  info(module: string, message: string, data?: unknown): void {
    const entry = this.formatMessage('INFO', module, message, data);
    this.log(entry);
  }

  warn(module: string, message: string, data?: unknown): void {
    const entry = this.formatMessage('WARN', module, message, data);
    this.log(entry);
  }

  error(module: string, message: string, data?: unknown): void {
    const entry = this.formatMessage('ERROR', module, message, data);
    this.log(entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportToFile(filePath: string): void {
    const fs = require('fs');
    const content = this.logs
      .map((log) => JSON.stringify(log))
      .join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

export const logger = Logger.getInstance();
