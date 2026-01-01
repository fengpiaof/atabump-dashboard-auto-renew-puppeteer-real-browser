import { ConfigLoader } from './config/loader';
import { RenewalConfig, RenewalResult, BatchRenewalResult } from './types';
import { logger, LogLevel } from './utils/logger';
declare class RenewalTask {
    private browserController;
    private config;
    constructor(config: RenewalConfig);
    executeRenewal(serverId: string, serverName?: string): Promise<RenewalResult>;
    executeBatchRenewal(serverIds: string[]): Promise<BatchRenewalResult>;
    close(): Promise<void>;
}
export { RenewalTask, ConfigLoader, logger, LogLevel };
//# sourceMappingURL=index.d.ts.map