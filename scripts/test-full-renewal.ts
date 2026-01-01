/**
 * 完整的端到端续期测试
 * 使用实际的项目代码测试整个续期流程
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 加载配置
const configPath = resolve(__dirname, '..', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

console.log('📋 加载配置:');
console.log(`   目标URL: ${config.targetUrl}`);
console.log(`   用户名: ${config.credentials.username}`);
console.log(`   服务器数量: ${config.servers.length}`);
config.servers.forEach((server: any, index: number) => {
  console.log(`   服务器 ${index + 1}: ${server.name} (ID: ${server.id})`);
});
console.log(`   Chrome路径: ${config.browser.executablePath}`);
console.log(`   DoH URL: https://doh.pub/dns-query`);

// 动态导入项目模块
async function runFullRenewalTest() {
  try {
    console.log('\n🚀 开始完整续期测试...\n');

    // 导入项目模块
    const { BrowserController } = await import('../src/browser/controller');
    const { LoginProcessor } = await import('../src/tasks/login');
    const { ServerLocator } = await import('../src/tasks/locator');
    const { RenewalExecutor } = await import('../src/tasks/renewal');

    // 1. 启动浏览器
    console.log('📦 步骤 1: 启动浏览器');
    const browserController = new BrowserController(config.browser);
    await browserController.launch();
    const page = await browserController.newPage();
    console.log('✅ 浏览器启动成功\n');

    // 2. 登录
    console.log('🔐 步骤 2: 登录账户');
    await page.goto(config.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const loginProcessor = new LoginProcessor(page);
    const loginSuccess = await loginProcessor.login(config.credentials);

    if (!loginSuccess) {
      throw new Error('登录失败');
    }
    console.log('✅ 登录成功\n');

    // 3. 对每个服务器进行续期
    for (let i = 0; i < config.servers.length; i++) {
      const server = config.servers[i];
      console.log(`\n🖥️  步骤 3.${i + 1}: 处理服务器 ${server.name || server.id}`);

      // 定位服务器
      const serverLocator = new ServerLocator(page);
      const serverInfo = await serverLocator.locateServer(server.id, server.name);
      console.log(`   找到服务器: ${serverInfo.name} (${serverInfo.id})`);

      // 进入服务器详情页
      await serverLocator.navigateToServerDetail(serverInfo);
      console.log('   ✅ 已进入服务器详情页');

      // 执行续期
      const renewalExecutor = new RenewalExecutor(page);
      const result = await renewalExecutor.executeRenewal(server.id);

      if (result.success) {
        console.log('   ✅ 续期成功');
        if (result.details?.newExpiryDate) {
          console.log(`   新到期时间: ${result.details.newExpiryDate}`);
        }
      } else {
        console.log(`   ❌ 续期失败: ${result.message}`);
        if (result.error) {
          console.log(`   错误代码: ${result.error.code}`);
        }
      }
    }

    console.log('\n✨ 所有服务器续期测试完成!');
    console.log('浏览器将保持打开 30 秒供查看...');
    console.log('按 Ctrl+C 立即退出\n');

    // 保持浏览器打开 30 秒
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // 关闭浏览器
    await browserController.close();
    console.log('✅ 浏览器已关闭');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
runFullRenewalTest().catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
