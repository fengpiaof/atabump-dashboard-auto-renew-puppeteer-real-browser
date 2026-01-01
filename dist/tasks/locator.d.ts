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
    locateServer(serverId: string, serverName?: string): Promise<ServerInfo>;
    private waitForServerList;
    private locateById;
    private locateByName;
    private locateByFuzzyMatch;
    navigateToServerDetail(serverInfo: ServerInfo): Promise<void>;
    private navigateToServerDetailByClick;
}
//# sourceMappingURL=locator.d.ts.map