import * as fs from 'fs';
import * as path from 'path';
import { RenewalConfig, ErrorType, RenewalError } from '../types';

/**
 * 配置加载器类
 */
export class ConfigLoader {
  /**
   * 从文件加载配置
   * @param configPath - 配置文件路径
   * @returns 配置对象
   */
  static loadFromFile(configPath: string): RenewalConfig {
    if (!fs.existsSync(configPath)) {
      throw new RenewalError(
        ErrorType.CONFIG_ERROR,
        `配置文件不存在: ${configPath}`
      );
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    let config: RenewalConfig;

    try {
      config = JSON.parse(configContent) as RenewalConfig;
    } catch (error) {
      throw new RenewalError(
        ErrorType.CONFIG_ERROR,
        `配置文件格式错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return this.validateAndNormalize(config);
  }

  /**
   * 从对象创建配置
   * @param configObj - 配置对象
   * @returns 配置对象
   */
  static loadFromObject(configObj: Partial<RenewalConfig>): RenewalConfig {
    return this.validateAndNormalize(configObj as RenewalConfig);
  }

  /**
   * 验证并规范化配置
   * @param config - 原始配置
   * @returns 验证后的配置
   */
  private static validateAndNormalize(config: RenewalConfig): RenewalConfig {
    // 验证必填字段
    if (!config.credentials?.username || !config.credentials?.password) {
      throw new RenewalError(
        ErrorType.CONFIG_ERROR,
        '缺少登录凭证 (credentials.username 和 credentials.password 为必填项)'
      );
    }

    if (!config.targetUrl) {
      throw new RenewalError(
        ErrorType.CONFIG_ERROR,
        '缺少目标URL (targetUrl 为必填项)'
      );
    }

    if (!config.servers || config.servers.length === 0) {
      throw new RenewalError(
        ErrorType.CONFIG_ERROR,
        '缺少服务器配置 (servers 为必填项且不能为空)'
      );
    }

    // 验证服务器ID
    for (const server of config.servers) {
      if (!server.id) {
        throw new RenewalError(
          ErrorType.CONFIG_ERROR,
          '服务器配置中缺少 id 字段'
        );
      }
    }

    // 设置默认值
    const normalizedConfig: RenewalConfig = {
      ...config,
      browser: {
        ...config.browser,
        headless: config.browser?.headless ?? true,
        timeout: config.browser?.timeout ?? 30000,
        waitUntil: config.browser?.waitUntil ?? 'networkidle0',
        windowWidth: config.browser?.windowWidth ?? 1920,
        windowHeight: config.browser?.windowHeight ?? 1080,
      },
      retry: {
        ...config.retry,
        maxRetries: config.retry?.maxRetries ?? 3,
        retryInterval: config.retry?.retryInterval ?? 5000,
        retryOnTimeout: config.retry?.retryOnTimeout ?? true,
        exponentialBackoff: config.retry?.exponentialBackoff ?? false,
        maxRetryInterval: config.retry?.maxRetryInterval ?? 60000,
        retryableErrors: config.retry?.retryableErrors ?? [],
      },
      notifications: {
        ...config.notifications,
        enableEmail: config.notifications?.enableEmail ?? false,
        enableWebhook: config.notifications?.enableWebhook ?? false,
        enableStdout: config.notifications?.enableStdout ?? true,
      },
    };

    return normalizedConfig;
  }

  /**
   * 获取默认配置模板
   * @returns 默认配置模板
   */
  static getDefaultTemplate(): Partial<RenewalConfig> {
    return {
      targetUrl: 'https://dashboard.example.com/dashboard',
      credentials: {
        username: 'your-email@example.com',
        password: 'your-password',
      },
      servers: [
        {
          id: 'server-id-1',
          name: 'My Server 1',
        },
      ],
      browser: {
        headless: true,
        timeout: 30000,
        waitUntil: 'networkidle0',
        windowWidth: 1920,
        windowHeight: 1080,
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
  }
}
