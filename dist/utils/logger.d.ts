export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    timestamp: string;
    level: string;
    module: string;
    message: string;
    data?: unknown;
}
export declare class Logger {
    private static instance;
    private logLevel;
    private logs;
    private constructor();
    static getInstance(): Logger;
    setLogLevel(level: LogLevel): void;
    private formatMessage;
    private shouldLog;
    private stringToLogLevel;
    private log;
    debug(module: string, message: string, data?: unknown): void;
    info(module: string, message: string, data?: unknown): void;
    warn(module: string, message: string, data?: unknown): void;
    error(module: string, message: string, data?: unknown): void;
    getLogs(): LogEntry[];
    clearLogs(): void;
    exportToFile(filePath: string): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map