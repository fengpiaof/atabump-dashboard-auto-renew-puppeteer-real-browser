/**
 * 配置模式定义
 * 提供配置结构的类型检查和验证
 */

import { RenewalConfig } from '../types';

// 配置模式已经在 types/index.ts 中定义
// 此文件保留用于未来扩展验证规则

/**
 * 配置验证函数
 * @param config - 待验证的配置
 * @returns 验证结果
 */
export function validateConfig(config: Partial<RenewalConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.credentials) {
    errors.push('缺少 credentials 字段');
  } else {
    if (!config.credentials.username) {
      errors.push('缺少 credentials.username 字段');
    }
    if (!config.credentials.password) {
      errors.push('缺少 credentials.password 字段');
    }
  }

  if (!config.targetUrl) {
    errors.push('缺少 targetUrl 字段');
  }

  if (!config.servers || config.servers.length === 0) {
    errors.push('缺少 servers 字段或 servers 为空');
  } else {
    config.servers.forEach((server, index) => {
      if (!server.id) {
        errors.push(`服务器 [${index}] 缺少 id 字段`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
