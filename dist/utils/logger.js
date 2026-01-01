"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logLevel = LogLevel.INFO;
        this.logs = [];
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    formatMessage(level, module, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            data,
        };
    }
    shouldLog(level) {
        return level >= this.logLevel;
    }
    stringToLogLevel(level) {
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
    log(entry) {
        const entryLogLevel = this.stringToLogLevel(entry.level);
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
    debug(module, message, data) {
        const entry = this.formatMessage('DEBUG', module, message, data);
        this.log(entry);
    }
    info(module, message, data) {
        const entry = this.formatMessage('INFO', module, message, data);
        this.log(entry);
    }
    warn(module, message, data) {
        const entry = this.formatMessage('WARN', module, message, data);
        this.log(entry);
    }
    error(module, message, data) {
        const entry = this.formatMessage('ERROR', module, message, data);
        this.log(entry);
    }
    getLogs() {
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
    exportToFile(filePath) {
        const fs = require('fs');
        const content = this.logs
            .map((log) => JSON.stringify(log))
            .join('\n');
        fs.writeFileSync(filePath, content, 'utf-8');
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map