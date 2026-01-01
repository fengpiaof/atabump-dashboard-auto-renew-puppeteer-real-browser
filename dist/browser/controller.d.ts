/**
 * 浏览器控制器
 */
import { Page } from 'puppeteer';
import { BrowserConfig } from '../types';
export declare class BrowserController {
    private browser;
    private currentPage;
    private config;
    private readonly DEFAULT_DOH_URL;
    constructor(config: BrowserConfig);
    /**
     * 生成 DoH (DNS over HTTPS) 参数
     * 使用 Chrome fieldtrial 方式配置
     */
    private getDoHArgs;
    /**
     * 启动浏览器
     */
    launch(): Promise<void>;
    /**
     * 创建新页面
     */
    newPage(): Promise<Page>;
    /**
     * 获取当前页面
     */
    getCurrentPage(): Page;
    /**
     * 导航到指定 URL
     */
    navigate(url: string): Promise<void>;
    /**
     * 等待 Cloudflare 验证完成
     */
    waitForCloudflareVerification(): Promise<void>;
    /**
     * 截图
     */
    screenshot(filePath?: string): Promise<Buffer | Uint8Array>;
    /**
     * 获取页面 HTML
     */
    getHtml(): Promise<string>;
    /**
     * 关闭浏览器
     */
    close(): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map