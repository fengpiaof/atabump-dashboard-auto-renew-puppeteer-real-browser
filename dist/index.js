"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.logger = exports.ConfigLoader = exports.RenewalTask = void 0;
const controller_1 = require("./browser/controller");
const login_1 = require("./tasks/login");
const locator_1 = require("./tasks/locator");
const renewal_1 = require("./tasks/renewal");
const loader_1 = require("./config/loader");
Object.defineProperty(exports, "ConfigLoader", { enumerable: true, get: function () { return loader_1.ConfigLoader; } });
const logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
const types_1 = require("./types");
class RenewalTask {
    constructor(config) {
        this.browserController = null;
        this.config = config;
    }
    async executeRenewal(serverId, serverName) {
        try {
            logger_1.logger.info('RenewalTask', `========== 开始续期任务 ==========`);
            if (!this.browserController) {
                this.browserController = new controller_1.BrowserController(this.config.browser);
                await this.browserController.launch();
            }
            const page = await this.browserController.newPage();
            await this.browserController.navigate(this.config.targetUrl);
            await this.browserController.waitForCloudflareVerification();
            const loginProcessor = new login_1.LoginProcessor(page);
            const loginSuccess = await loginProcessor.login(this.config.credentials);
            if (!loginSuccess) {
                throw new types_1.RenewalError(types_1.ErrorType.VERIFY_ERROR, '登录失败');
            }
            const serverLocator = new locator_1.ServerLocator(page);
            const serverInfo = await serverLocator.locateServer(serverId, serverName);
            await serverLocator.navigateToServerDetail(serverInfo);
            const renewalExecutor = new renewal_1.RenewalExecutor(page);
            const result = await renewalExecutor.executeRenewal(serverId);
            logger_1.logger.info('RenewalTask', `========== 续期任务结束 ==========`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('RenewalTask', '续期任务执行失败', error);
            return {
                success: false,
                serverId,
                message: `续期任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
                error: {
                    code: error instanceof types_1.RenewalError ? error.type : types_1.ErrorType.BUSINESS_ERROR,
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            };
        }
    }
    async executeBatchRenewal(serverIds) {
        const startTime = Date.now();
        const results = [];
        logger_1.logger.info('RenewalTask', `========== 开始批量续期任务 ==========`);
        logger_1.logger.info('RenewalTask', `待处理服务器数量: ${serverIds.length}`);
        for (const serverId of serverIds) {
            const serverConfig = this.config.servers.find((s) => s.id === serverId);
            const result = await this.executeRenewal(serverId, serverConfig?.name);
            results.push(result);
            if (!result.success) {
                await new Promise((resolve) => setTimeout(resolve, this.config.retry.retryInterval));
            }
        }
        const executionTime = Date.now() - startTime;
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;
        logger_1.logger.info('RenewalTask', `========== 批量续期任务完成 ==========`);
        logger_1.logger.info('RenewalTask', `总数量: ${serverIds.length}, 成功: ${successCount}, 失败: ${failureCount}, 耗时: ${executionTime}ms`);
        return {
            totalCount: serverIds.length,
            successCount,
            failureCount,
            results,
            executionTime,
        };
    }
    async close() {
        if (this.browserController) {
            await this.browserController.close();
            this.browserController = null;
        }
    }
}
exports.RenewalTask = RenewalTask;
async function main() {
    try {
        const args = process.argv.slice(2);
        const configIndex = args.indexOf('--config');
        const serverIdIndex = args.indexOf('--server-id');
        const serverNameIndex = args.indexOf('--server-name');
        const batchIndex = args.indexOf('--batch');
        let config;
        if (configIndex !== -1 && args[configIndex + 1]) {
            const configPath = args[configIndex + 1];
            config = loader_1.ConfigLoader.loadFromFile(configPath);
        }
        else {
            throw new Error('请使用 --config 参数指定配置文件');
        }
        logger_1.logger.setLogLevel(logger_1.LogLevel.INFO);
        const task = new RenewalTask(config);
        if (batchIndex !== -1) {
            const serverIds = config.servers.map((s) => s.id);
            const batchResult = await task.executeBatchRenewal(serverIds);
            console.log('\n========== 批量续期结果摘要 ==========');
            console.log(`总计: ${batchResult.totalCount}`);
            console.log(`成功: ${batchResult.successCount}`);
            console.log(`失败: ${batchResult.failureCount}`);
            console.log(`耗时: ${batchResult.executionTime}ms`);
            console.log('=====================================\n');
        }
        else if (serverIdIndex !== -1 && args[serverIdIndex + 1]) {
            const serverId = args[serverIdIndex + 1];
            const serverName = serverNameIndex !== -1 ? args[serverNameIndex + 1] : undefined;
            const result = await task.executeRenewal(serverId, serverName);
            console.log('\n========== 续期结果 ==========');
            console.log(`服务器ID: ${result.serverId}`);
            console.log(`状态: ${result.success ? '成功' : '失败'}`);
            console.log(`消息: ${result.message}`);
            if (result.details) {
                console.log(`详情:`, result.details);
            }
            console.log('=============================\n');
        }
        else {
            const firstServer = config.servers[0];
            if (firstServer) {
                const result = await task.executeRenewal(firstServer.id, firstServer.name);
                console.log('\n========== 续期结果 ==========');
                console.log(`服务器ID: ${result.serverId}`);
                console.log(`状态: ${result.success ? '成功' : '失败'}`);
                console.log(`消息: ${result.message}`);
                if (result.details) {
                    console.log(`详情:`, result.details);
                }
                console.log('=============================\n');
            }
        }
        await task.close();
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Main', '程序执行失败', error);
        console.error('程序执行失败:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map