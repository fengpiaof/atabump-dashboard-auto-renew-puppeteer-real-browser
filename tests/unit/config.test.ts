/**
 * 配置加载器单元测试
 */

import { ConfigLoader } from '../../src/config/loader';
import { validateConfig } from '../../src/config/schema';
import { RenewalConfig, ErrorType } from '../../src/types';
import { RenewalError } from '../../src/types';

describe('ConfigLoader', () => {
  describe('validateConfig', () => {
    it('should validate a correct config', () => {
      const validConfig: Partial<RenewalConfig> = {
        targetUrl: 'https://example.com',
        credentials: {
          username: 'test@example.com',
          password: 'password123',
        },
        servers: [
          {
            id: 'server-1',
            name: 'Test Server',
          },
        ],
        browser: {
          headless: true,
          timeout: 30000,
          waitUntil: 'networkidle0',
        },
        retry: {
          maxRetries: 3,
          retryInterval: 5000,
          retryOnTimeout: true,
        },
        notifications: {
          enableEmail: false,
          enableWebhook: false,
          enableStdout: true,
        },
      };

      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing credentials', () => {
      const invalidConfig = {
        targetUrl: 'https://example.com',
        servers: [],
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少 credentials 字段');
    });

    it('should detect missing username', () => {
      const invalidConfig = {
        credentials: {
          password: 'password123',
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少 credentials.username 字段');
    });

    it('should detect missing server id', () => {
      const invalidConfig = {
        credentials: {
          username: 'test@example.com',
          password: 'password123',
        },
        servers: [
          {
            name: 'Test Server',
          },
        ],
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('服务器 [0] 缺少 id 字段');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return a valid template', () => {
      const template = ConfigLoader.getDefaultTemplate();

      expect(template).toHaveProperty('targetUrl');
      expect(template).toHaveProperty('credentials');
      expect(template).toHaveProperty('servers');
      expect(template).toHaveProperty('browser');
      expect(template).toHaveProperty('retry');
      expect(template).toHaveProperty('notifications');

      expect(template.credentials).toHaveProperty('username');
      expect(template.credentials).toHaveProperty('password');
      expect(template.servers).toBeInstanceOf(Array);
    });
  });
});

describe('ConfigLoader normalization', () => {
  it('should set default values for browser config', () => {
    const minimalConfig: Partial<RenewalConfig> = {
      targetUrl: 'https://example.com',
      credentials: {
        username: 'test@example.com',
        password: 'password123',
      },
      servers: [
        {
          id: 'server-1',
        },
      ],
    } as RenewalConfig;

    const config = ConfigLoader.loadFromObject(minimalConfig);

    expect(config.browser.headless).toBe(true);
    expect(config.browser.timeout).toBe(30000);
    expect(config.browser.waitUntil).toBe('networkidle0');
    expect(config.browser.windowWidth).toBe(1920);
    expect(config.browser.windowHeight).toBe(1080);
  });

  it('should set default values for retry config', () => {
    const minimalConfig: Partial<RenewalConfig> = {
      targetUrl: 'https://example.com',
      credentials: {
        username: 'test@example.com',
        password: 'password123',
      },
      servers: [
        {
          id: 'server-1',
        },
      ],
    } as RenewalConfig;

    const config = ConfigLoader.loadFromObject(minimalConfig);

    expect(config.retry.maxRetries).toBe(3);
    expect(config.retry.retryInterval).toBe(5000);
    expect(config.retry.retryOnTimeout).toBe(true);
    expect(config.retry.exponentialBackoff).toBe(false);
    expect(config.retry.maxRetryInterval).toBe(60000);
  });

  it('should set default values for notifications config', () => {
    const minimalConfig: Partial<RenewalConfig> = {
      targetUrl: 'https://example.com',
      credentials: {
        username: 'test@example.com',
        password: 'password123',
      },
      servers: [
        {
          id: 'server-1',
        },
      ],
    } as RenewalConfig;

    const config = ConfigLoader.loadFromObject(minimalConfig);

    expect(config.notifications.enableEmail).toBe(false);
    expect(config.notifications.enableWebhook).toBe(false);
    expect(config.notifications.enableStdout).toBe(true);
  });
});
