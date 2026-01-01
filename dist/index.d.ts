/**
 * 服务器自动续期系统主程序
 */
import { ConfigLoader } from './config/loader';
import { RenewalConfig, RenewalResult, BatchRenewalResult } from './types';
import { logger, LogLevel } from './utils/logger';
declare class RenewalTask {
    private browserController;
    private config;
    constructor(config: RenewalConfig);
    /**
     * 执行单个服务器续期
     */
    executeRenewal(serverId: string, serverName?: string): Promise<RenewalResult>;
    /**
     * 执行批量服务器续期
     */
    executeBatchRenewal(serverIds: string[]): Promise<BatchRenewalResult>;
    /**
     * 关闭浏览器实例
     */
    close(): Promise<void>;
}
export { RenewalTask, ConfigLoader, logger, LogLevel };
//# sourceMappingURL=index.d.ts.map