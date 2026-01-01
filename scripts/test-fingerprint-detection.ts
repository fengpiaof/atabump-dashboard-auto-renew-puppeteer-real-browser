/**
 * 测试脚本：验证浏览器指纹反检测措施
 *
 * 此脚本会访问多个反爬虫检测网站，验证我们的反检测措施是否有效
 */

import { RenewalTask } from '../src/index';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function testFingerprintDetection() {
  logger.info('TestScript', '开始测试浏览器指纹反检测...');

  // 测试配置
  const config = {
    targetUrl: 'https://dashboard.katabump.com',
    credentials: {
      username: 'test@example.com',
      password: 'testpassword',
    },
    servers: [
      {
        id: 'test-server-id',
        name: 'Test Server',
      },
    ],
    browser: {
      headless: false, // 使用有头模式便于观察
      timeout: 60000,
      windowWidth: 1920,
      windowHeight: 1080,
    },
    retry: {
      maxRetries: 3,
      retryInterval: 2000,
      retryOnTimeout: true,
    },
    notifications: {
      enableEmail: false,
      enableWebhook: false,
      enableStdout: true,
    },
  };

  const task = new RenewalTask(config);

  try {
    // 启动浏览器
    await task.launch();

    // 测试网站列表
    const testSites = [
      {
        name: 'Sannysoft Bot Detector',
        url: 'https://bot.sannysoft.com/',
        description: '综合检测 Puppeteer 特征',
      },
      {
        name: 'AHS Headless Detector',
        url: 'https://arh.antoinevastel.com/bots/areyouheadless',
        description: '检测无头浏览器特征',
      },
      {
        name: 'FingerprintJS',
        url: 'https://fingerprintjs.demo/',
        description: '浏览器指纹识别',
      },
      {
        name: 'Whoer.net',
        url: 'https://whoer.net/',
        description: '综合系统信息检测',
      },
    ];

    const results: any[] = [];

    for (const site of testSites) {
      logger.info('TestScript', `\n正在访问: ${site.name}`);
      logger.info('TestScript', `URL: ${site.url}`);
      logger.info('TestScript', `说明: ${site.description}\n`);

      try {
        // 访问测试网站
        await task.navigateToUrl(site.url);

        // 等待页面加载
        logger.info('TestScript', '等待页面加载完成...');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 截图保存结果
        const screenshotDir = path.join(process.cwd(), 'screenshots', 'fingerprint-tests');
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const filename = `${site.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
        const screenshotPath = path.join(screenshotDir, filename);
        await task.screenshot(screenshotPath);

        logger.info('TestScript', `截图已保存: ${screenshotPath}`);

        results.push({
          site: site.name,
          url: site.url,
          status: 'visited',
          screenshot: screenshotPath,
        });

        // 等待用户观察
        logger.info('TestScript', '请观察浏览器检测结果，按 Enter 继续...');
        await new Promise((resolve) => {
          process.stdin.once('data', resolve);
        });

      } catch (error) {
        logger.error('TestScript', `访问 ${site.name} 失败`, error);
        results.push({
          site: site.name,
          url: site.url,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 输出测试结果汇总
    logger.info('TestScript', '\n========== 测试结果汇总 ==========');
    results.forEach((result) => {
      logger.info('TestScript', `\n${result.site}:`);
      logger.info('TestScript', `  状态: ${result.status}`);
      if (result.screenshot) {
        logger.info('TestScript', `  截图: ${result.screenshot}`);
      }
      if (result.error) {
        logger.info('TestScript', `  错误: ${result.error}`);
      }
    });

    // 检测浏览器指纹特征
    logger.info('TestScript', '\n========== 检测浏览器指纹特征 ==========');
    const page = (task as any).browserController.getCurrentPage();

    const fingerprintData = await page.evaluate(() => {
      return {
        webdriver: navigator.webdriver,
        languages: navigator.languages,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        plugins: navigator.plugins.length,
        chrome: typeof (window as any).chrome !== 'undefined',
        permissions: typeof navigator.permissions.query !== 'undefined',
        webglVendor: (() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            }
          }
          return 'unknown';
        })(),
        webglRenderer: (() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
          }
          return 'unknown';
        })(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
        },
      };
    });

    console.table(fingerprintData);

    // 保存指纹数据
    const fingerprintPath = path.join(
      process.cwd(),
      'screenshots',
      `fingerprint-data-${Date.now()}.json`
    );
    fs.writeFileSync(fingerprintPath, JSON.stringify(fingerprintData, null, 2));
    logger.info('TestScript', `\n指纹数据已保存: ${fingerprintPath}`);

  } catch (error) {
    logger.error('TestScript', '测试失败', error);
  } finally {
    // 关闭浏览器
    await task.close();
    logger.info('TestScript', '测试完成');
  }
}

// 运行测试
testFingerprintDetection().catch((error) => {
  logger.error('TestScript', '测试脚本执行失败', error);
  process.exit(1);
});
