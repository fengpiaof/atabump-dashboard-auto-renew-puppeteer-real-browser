"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserController = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class BrowserController {
    constructor(config) {
        this.browser = null;
        this.currentPage = null;
        this.DEFAULT_DOH_URL = 'https://doh.pub/dns-query';
        this.config = config;
    }
    getDoHArgs() {
        const dohUrl = this.config.dohUrl || this.DEFAULT_DOH_URL;
        const encodedUrl = encodeURIComponent(dohUrl);
        return [
            '--enable-features=DnsOverHttps',
            '--force-fieldtrials=DoHTrial/Group1',
            `--force-fieldtrial-params=DoHTrial.Group1:Templates/${encodedUrl}/Fallback/true`
        ];
    }
    async launch() {
        try {
            logger_1.logger.info('BrowserController', '正在启动浏览器...');
            const launchOptions = {
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                },
                headless: this.config.headless ?? true,
                args: [
                    '--window-size=1920,1080',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    ...this.getDoHArgs(),
                ],
            };
            if (this.config.executablePath) {
                launchOptions.executablePath = this.config.executablePath;
            }
            if (this.config.userDataDir) {
                launchOptions.userDataDir = this.config.userDataDir;
                logger_1.logger.info('BrowserController', `使用用户数据目录: ${this.config.userDataDir}`);
            }
            this.browser = await puppeteer_1.default.launch(launchOptions);
            const dohUrl = this.config.dohUrl || this.DEFAULT_DOH_URL;
            logger_1.logger.info('BrowserController', `浏览器启动成功 (DoH: ${dohUrl})`);
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '浏览器启动失败', error);
            throw new types_1.RenewalError(types_1.ErrorType.BROWSER_ERROR, `浏览器启动失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async newPage() {
        if (!this.browser) {
            throw new types_1.RenewalError(types_1.ErrorType.BROWSER_ERROR, '浏览器未启动,请先调用 launch() 方法');
        }
        try {
            const page = await this.browser.newPage();
            await page.setViewport({
                width: this.config.windowWidth ?? 1920,
                height: this.config.windowHeight ?? 1080,
            });
            if (this.config.userAgent) {
                await page.setUserAgent(this.config.userAgent);
            }
            page.setDefaultTimeout(this.config.timeout ?? 30000);
            page.setDefaultNavigationTimeout(this.config.timeout ?? 30000);
            this.currentPage = page;
            logger_1.logger.info('BrowserController', '新页面创建成功');
            return page;
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '创建页面失败', error);
            throw new types_1.RenewalError(types_1.ErrorType.BROWSER_ERROR, `创建页面失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getCurrentPage() {
        if (!this.currentPage) {
            throw new types_1.RenewalError(types_1.ErrorType.BROWSER_ERROR, '当前没有活动页面,请先调用 newPage() 方法');
        }
        return this.currentPage;
    }
    async navigate(url) {
        const page = this.getCurrentPage();
        try {
            logger_1.logger.info('BrowserController', `正在导航到: ${url}`);
            await page.goto(url, {
                waitUntil: this.config.waitUntil ?? 'networkidle0',
                timeout: this.config.timeout ?? 30000,
            });
            logger_1.logger.info('BrowserController', '页面加载完成');
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '页面导航失败', error);
            throw new types_1.RenewalError(types_1.ErrorType.NETWORK_ERROR, `页面导航失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async waitForCloudflareVerification() {
        const page = this.getCurrentPage();
        try {
            logger_1.logger.info('BrowserController', '等待 Cloudflare 验证完成...');
            const hasCloudflare = await page.evaluate(() => {
                return (document.querySelector('#turnstile-container') !== null ||
                    document.querySelector('[data-sitekey]') !== null ||
                    window.location.href.includes('challenge-platform'));
            });
            if (!hasCloudflare) {
                logger_1.logger.info('BrowserController', '未检测到 Cloudflare 验证');
                return;
            }
            await page.waitForFunction(() => {
                return (document.querySelector('#turnstile-container') === null &&
                    !document.querySelector('[data-sitekey]') &&
                    !window.location.href.includes('challenge-platform'));
            }, { timeout: 300000 });
            logger_1.logger.info('BrowserController', 'Cloudflare 验证完成');
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '等待 Cloudflare 验证超时', error);
            throw new types_1.RenewalError(types_1.ErrorType.VERIFY_ERROR, `Cloudflare 验证超时: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async screenshot(filePath) {
        const page = this.getCurrentPage();
        try {
            if (filePath) {
                await page.screenshot({ path: filePath, fullPage: true });
                logger_1.logger.info('BrowserController', `截图已保存到: ${filePath}`);
                return Buffer.from('');
            }
            const screenshot = await page.screenshot({ fullPage: true });
            logger_1.logger.info('BrowserController', '截图成功');
            return screenshot;
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '截图失败', error);
            throw new types_1.RenewalError(types_1.ErrorType.BROWSER_ERROR, `截图失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getHtml() {
        const page = this.getCurrentPage();
        return await page.content();
    }
    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.currentPage = null;
                logger_1.logger.info('BrowserController', '浏览器已关闭');
            }
        }
        catch (error) {
            logger_1.logger.error('BrowserController', '关闭浏览器失败', error);
        }
    }
}
exports.BrowserController = BrowserController;
//# sourceMappingURL=controller.js.map