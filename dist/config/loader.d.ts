import { RenewalConfig } from '../types';
/**
 * 配置加载器类
 */
export declare class ConfigLoader {
    /**
     * 从文件加载配置
     * @param configPath - 配置文件路径
     * @returns 配置对象
     */
    static loadFromFile(configPath: string): RenewalConfig;
    /**
     * 从对象创建配置
     * @param configObj - 配置对象
     * @returns 配置对象
     */
    static loadFromObject(configObj: Partial<RenewalConfig>): RenewalConfig;
    /**
     * 验证并规范化配置
     * @param config - 原始配置
     * @returns 验证后的配置
     */
    private static validateAndNormalize;
    /**
     * 获取默认配置模板
     * @returns 默认配置模板
     */
    static getDefaultTemplate(): Partial<RenewalConfig>;
}
//# sourceMappingURL=loader.d.ts.map