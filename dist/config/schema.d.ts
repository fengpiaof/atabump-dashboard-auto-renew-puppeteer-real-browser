/**
 * 配置模式定义
 * 提供配置结构的类型检查和验证
 */
import { RenewalConfig } from '../types';
/**
 * 配置验证函数
 * @param config - 待验证的配置
 * @returns 验证结果
 */
export declare function validateConfig(config: Partial<RenewalConfig>): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=schema.d.ts.map