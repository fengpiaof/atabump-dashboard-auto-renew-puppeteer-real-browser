/**
 * 服务器自动续期系统主程序
 */

import { BrowserController } from './browser/controller';
import { LoginProcessor } from './tasks/login';
import { ServerLocator } from './tasks/locator';
import { RenewalExecutor } from './tasks/renewal';
import { ConfigLoader } from './config/loader';
import { RenewalConfig, RenewalResult, BatchRenewalResult } from './types';
import { logger, LogLevel } from './utils/logger';
import { RenewalError, ErrorType } from './types';

class RenewalTask {
  private browserController: BrowserController | null = null;
  private config: RenewalConfig;

  constructor(config: RenewalConfig) {
    this.config = config;
  }

  /**
   * 执行单个服务器续期
   */
  async executeRenewal(serverId: string, serverName?: string): Promise<RenewalResult> {
    try {
      logger.info('RenewalTask', `========== 开始续期任务 ==========`);

      // 启动浏览器
      if (!this.browserController) {
        this.browserController = new BrowserController(this.config.browser);
        await this.browserController.launch();
      }

      const page = await this.browserController.newPage();

      // 导航到目标页面
      await this.browserController.navigate(this.config.targetUrl);

      // 等待 Cloudflare 验证
      await this.browserController.waitForCloudflareVerification();

      // 执行登录
      const loginProcessor = new LoginProcessor(page);
      const loginSuccess = await loginProcessor.login(this.config.credentials);

      if (!loginSuccess) {
        throw new RenewalError(ErrorType.VERIFY_ERROR, '登录失败');
      }

      // 定位服务器
      const serverLocator = new ServerLocator(page);
      const serverInfo = await serverLocator.locateServer(serverId, serverName);

      // 导航到服务器详情页面
      await serverLocator.navigateToServerDetail(serverInfo);

      // 执行续期
      const renewalExecutor = new RenewalExecutor(page);
      const result = await renewalExecutor.executeRenewal(serverId);

      logger.info('RenewalTask', `========== 续期任务结束 ==========`);
      return result;
    } catch (error) {
      logger.error('RenewalTask', '续期任务执行失败', error);

      return {
        success: false,
        serverId,
        message: `续期任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          code: error instanceof RenewalError ? error.type : ErrorType.BUSINESS_ERROR,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * 执行批量服务器续期
   */
  async executeBatchRenewal(serverIds: string[]): Promise<BatchRenewalResult> {
    const startTime = Date.now();
    const results: RenewalResult[] = [];

    logger.info('RenewalTask', `========== 开始批量续期任务 ==========`);
    logger.info('RenewalTask', `待处理服务器数量: ${serverIds.length}`);

    for (const serverId of serverIds) {
      const serverConfig = this.config.servers.find((s) => s.id === serverId);
      const result = await this.executeRenewal(serverId, serverConfig?.name);
      results.push(result);

      // 如果失败,等待一段时间后继续
      if (!result.success) {
        await new Promise((resolve) => setTimeout(resolve, this.config.retry.retryInterval));
      }
    }

    const executionTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logger.info('RenewalTask', `========== 批量续期任务完成 ==========`);
    logger.info('RenewalTask', `总数量: ${serverIds.length}, 成功: ${successCount}, 失败: ${failureCount}, 耗时: ${executionTime}ms`);

    return {
      totalCount: serverIds.length,
      successCount,
      failureCount,
      results,
      executionTime,
    };
  }

  /**
   * 关闭浏览器实例
   */
  async close(): Promise<void> {
    if (this.browserController) {
      await this.browserController.close();
      this.browserController = null;
    }
  }
}

/**
 * 主函数 - 命令行入口
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const configIndex = args.indexOf('--config');
    const serverIdIndex = args.indexOf('--server-id');
    const serverNameIndex = args.indexOf('--server-name');
    const batchIndex = args.indexOf('--batch');

    let config: RenewalConfig;

    if (configIndex !== -1 && args[configIndex + 1]) {
      // 从配置文件加载
      const configPath = args[configIndex + 1];
      config = ConfigLoader.loadFromFile(configPath);
    } else {
      throw new Error('请使用 --config 参数指定配置文件');
    }

    // 设置日志级别
    logger.setLogLevel(LogLevel.INFO);

    // 创建续期任务实例
    const task = new RenewalTask(config);

    if (batchIndex !== -1) {
      // 批量续期模式
      const serverIds = config.servers.map((s) => s.id);
      const batchResult = await task.executeBatchRenewal(serverIds);

      // 输出批量结果摘要
      console.log('\n========== 批量续期结果摘要 ==========');
      console.log(`总计: ${batchResult.totalCount}`);
      console.log(`成功: ${batchResult.successCount}`);
      console.log(`失败: ${batchResult.failureCount}`);
      console.log(`耗时: ${batchResult.executionTime}ms`);
      console.log('=====================================\n');
    } else if (serverIdIndex !== -1 && args[serverIdIndex + 1]) {
      // 单服务器续期模式
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
    } else {
      // 默认续期配置文件中的第一个服务器
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

    // 关闭浏览器
    await task.close();

    process.exit(0);
  } catch (error) {
    logger.error('Main', '程序执行失败', error);
    console.error('程序执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件,执行主函数
if (require.main === module) {
  main();
}

export { RenewalTask, ConfigLoader, logger, LogLevel };
