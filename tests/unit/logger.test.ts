/**
 * 日志工具单元测试
 */

import { Logger, LogLevel, LogEntry } from '../../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    // 每个测试前获取新的实例并清空日志
    logger = Logger.getInstance();
    logger.clearLogs();
    // 重置日志级别为 DEBUG 以确保所有测试从相同状态开始
    logger.setLogLevel(LogLevel.DEBUG);
    logger.clearLogs(); // 再次清空以确保
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('log levels', () => {
    it('should set log level', () => {
      logger.clearLogs();
      logger.setLogLevel(LogLevel.WARN);
      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warn message');
      logger.error('Test', 'Error message');

      const logs = logger.getLogs();
      // WARN 级别应该只记录 WARN 和 ERROR
      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it('should log all messages when level is DEBUG', () => {
      logger.clearLogs();
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warn message');
      logger.error('Test', 'Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
    });

    it('should log only errors when level is ERROR', () => {
      logger.clearLogs();
      logger.setLogLevel(LogLevel.ERROR);
      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warn message');
      logger.error('Test', 'Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('ERROR');
    });
  });

  describe('log methods', () => {
    beforeEach(() => {
      logger.setLogLevel(LogLevel.DEBUG);
    });

    it('should create debug log entry', () => {
      logger.debug('TestModule', 'Debug message', { key: 'value' });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('DEBUG');
      expect(logs[0].module).toBe('TestModule');
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].data).toEqual({ key: 'value' });
    });

    it('should create info log entry', () => {
      logger.info('TestModule', 'Info message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].message).toBe('Info message');
    });

    it('should create warn log entry', () => {
      logger.warn('TestModule', 'Warning message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('WARN');
      expect(logs[0].message).toBe('Warning message');
    });

    it('should create error log entry', () => {
      logger.error('TestModule', 'Error message', { error: 'details' });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('ERROR');
      expect(logs[0].message).toBe('Error message');
      expect(logs[0].data).toEqual({ error: 'details' });
    });
  });

  describe('log entry format', () => {
    it('should include timestamp', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Test', 'Message');

      const logs = logger.getLogs();
      expect(logs[0].timestamp).toBeDefined();
      expect(typeof logs[0].timestamp).toBe('string');
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should include all required fields', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Module1', 'Test message', { data: 'test' });

      const logs = logger.getLogs();
      const entry: LogEntry = logs[0];

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('module');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('data');
    });
  });

  describe('log management', () => {
    it('should retrieve all logs', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');
      logger.info('Test', 'Message 3');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('should clear all logs', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');

      logger.clearLogs();

      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should maintain log order', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Test', 'First');
      logger.info('Test', 'Second');
      logger.info('Test', 'Third');

      const logs = logger.getLogs();
      expect(logs[0].message).toBe('First');
      expect(logs[1].message).toBe('Second');
      expect(logs[2].message).toBe('Third');
    });
  });
});
