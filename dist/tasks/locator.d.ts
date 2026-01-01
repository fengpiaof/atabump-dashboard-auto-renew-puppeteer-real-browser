/**
 * 服务器定位器
 */
import { Page } from 'puppeteer';
export interface ServerInfo {
    id: string;
    name: string;
    element?: any;
    detailUrl?: string;
}
export declare class ServerLocator {
    private page;
    private readonly baseUrl;
    constructor(page: Page);
    /**
     * 定位目标服务器
     */
    locateServer(serverId: string, serverName?: string): Promise<ServerInfo>;
    /**
     * 等待服务器列表加载
     */
    private waitForServerList;
    /**
     * 通过 ID 定位服务器
     */
    private locateById;
    /**
     * 通过名称定位服务器
     */
    private locateByName;
    /**
     * 模糊匹配定位服务器
     */
    private locateByFuzzyMatch;
    /**
     * 点击进入服务器详情页面
     */
    navigateToServerDetail(serverInfo: ServerInfo): Promise<void>;
    /**
     * 通过点击方式进入服务器详情页面(备用方法)
     */
    private navigateToServerDetailByClick;
}
//# sourceMappingURL=locator.d.ts.map