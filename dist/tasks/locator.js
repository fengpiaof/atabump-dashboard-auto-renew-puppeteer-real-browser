"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerLocator = void 0;
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class ServerLocator {
    constructor(page) {
        this.page = page;
        this.baseUrl = 'https://dashboard.katabump.com';
    }
    async locateServer(serverId, serverName) {
        try {
            logger_1.logger.info('ServerLocator', `开始定位服务器: ID=${serverId}, Name=${serverName}`);
            await this.waitForServerList();
            let serverInfo = await this.locateById(serverId);
            if (!serverInfo && serverName) {
                logger_1.logger.info('ServerLocator', '未通过 ID 找到服务器,尝试通过名称查找');
                serverInfo = await this.locateByName(serverName);
            }
            if (!serverInfo && serverName) {
                logger_1.logger.info('ServerLocator', '未通过名称找到服务器,尝试模糊匹配');
                serverInfo = await this.locateByFuzzyMatch(serverId, serverName);
            }
            if (!serverInfo) {
                throw new types_1.RenewalError(types_1.ErrorType.BUSINESS_ERROR, `未找到目标服务器: ID=${serverId}, Name=${serverName}`);
            }
            logger_1.logger.info('ServerLocator', `成功定位到服务器: ${serverInfo.name} (${serverInfo.id})`);
            return serverInfo;
        }
        catch (error) {
            logger_1.logger.error('ServerLocator', '定位服务器失败', error);
            if (error instanceof types_1.RenewalError) {
                throw error;
            }
            throw new types_1.RenewalError(types_1.ErrorType.PARSE_ERROR, `定位服务器失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async waitForServerList() {
        logger_1.logger.info('ServerLocator', '等待服务器列表加载...');
        try {
            await this.page.waitForSelector('table, .server-list, .server-card, [data-testid="server-list"]', {
                timeout: 10000,
            });
            logger_1.logger.info('ServerLocator', '服务器列表已加载');
        }
        catch (error) {
            throw new types_1.RenewalError(types_1.ErrorType.PARSE_ERROR, '未找到服务器列表,可能未在正确的页面');
        }
    }
    async locateById(serverId) {
        try {
            const tableRow = await this.page.evaluateHandle((id) => {
                const rows = document.querySelectorAll('table tbody tr');
                for (const row of rows) {
                    const text = row.textContent || '';
                    if (text.includes(id)) {
                        const nameCell = row.querySelector('td:nth-child(2)');
                        return {
                            id,
                            name: nameCell?.textContent || `Server ${id}`,
                            element: row,
                        };
                    }
                }
                return null;
            }, serverId);
            if (tableRow) {
                const result = await tableRow.jsonValue();
                return result;
            }
            const card = await this.page.evaluateHandle((id) => {
                const cards = document.querySelectorAll('.server-card, [data-server-id]');
                for (const card of cards) {
                    const text = card.textContent || '';
                    const serverIdAttr = card.getAttribute('data-server-id');
                    if (text.includes(id) || serverIdAttr === id) {
                        const nameElement = card.querySelector('.server-name, h3, h4');
                        return {
                            id,
                            name: nameElement?.textContent || `Server ${id}`,
                            element: card,
                        };
                    }
                }
                return null;
            }, serverId);
            if (card) {
                const result = await card.jsonValue();
                return result;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.warn('ServerLocator', '通过 ID 定位服务器失败', error);
            return null;
        }
    }
    async locateByName(serverName) {
        try {
            const result = await this.page.evaluateHandle((name) => {
                const elements = document.querySelectorAll('td, .server-name, h3, h4, [data-server-name]');
                for (const element of elements) {
                    const text = element.textContent || '';
                    if (text.includes(name)) {
                        const parent = element.closest('tr, .server-card, [data-server-id]');
                        if (parent) {
                            const serverId = parent.getAttribute('data-server-id') || text.split(' ')[0];
                            return {
                                id: serverId,
                                name: text.trim(),
                                element: parent,
                            };
                        }
                    }
                }
                return null;
            }, serverName);
            if (result) {
                const serverInfo = await result.jsonValue();
                return serverInfo;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.warn('ServerLocator', '通过名称定位服务器失败', error);
            return null;
        }
    }
    async locateByFuzzyMatch(serverId, serverName) {
        try {
            const result = await this.page.evaluateHandle(({ id, name }) => {
                const allText = document.body.textContent || '';
                const idParts = id.split('-');
                const nameParts = name.split('-');
                for (const idPart of idParts) {
                    if (idPart.length < 3)
                        continue;
                    if (allText.includes(idPart)) {
                        return { id, name, found: true };
                    }
                }
                for (const namePart of nameParts) {
                    if (namePart.length < 3)
                        continue;
                    if (allText.includes(namePart)) {
                        return { id, name, found: true };
                    }
                }
                return null;
            }, { id: serverId, name: serverName });
            if (result) {
                const serverInfo = await result.jsonValue();
                return serverInfo;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.warn('ServerLocator', '模糊匹配定位服务器失败', error);
            return null;
        }
    }
    async navigateToServerDetail(serverInfo) {
        try {
            logger_1.logger.info('ServerLocator', `正在进入服务器详情: ${serverInfo.name}`);
            const detailUrl = `${this.baseUrl}/servers/edit?id=${serverInfo.id}`;
            logger_1.logger.info('ServerLocator', `使用直接 URL 访问: ${detailUrl}`);
            await this.page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(2000);
            const isDetailPage = await this.page.evaluate(() => {
                const title = document.title;
                const url = window.location.href;
                return title.includes('Your server') || url.includes('/servers/edit');
            });
            if (!isDetailPage) {
                throw new types_1.RenewalError(types_1.ErrorType.PARSE_ERROR, '未能进入服务器详情页面');
            }
            logger_1.logger.info('ServerLocator', '已进入服务器详情页面');
        }
        catch (error) {
            logger_1.logger.error('ServerLocator', '进入服务器详情失败', error);
            if (error instanceof types_1.RenewalError) {
                throw error;
            }
            logger_1.logger.info('ServerLocator', '尝试通过点击方式进入详情页...');
            await this.navigateToServerDetailByClick(serverInfo);
        }
    }
    async navigateToServerDetailByClick(serverInfo) {
        try {
            if (serverInfo.element) {
                await serverInfo.element.click();
            }
            else {
                const link = await this.page.evaluateHandle((info) => {
                    const links = document.querySelectorAll('a, button');
                    for (const link of links) {
                        const text = link.textContent || '';
                        if (text.includes(info.id) || text.includes(info.name)) {
                            return link;
                        }
                    }
                    return null;
                }, serverInfo);
                if (link) {
                    if (link instanceof this.page.constructor) {
                        await link.click();
                    }
                    else {
                        await this.page.evaluate((el) => {
                            if (el instanceof HTMLElement) {
                                el.click();
                            }
                        }, link);
                    }
                }
                else {
                    throw new types_1.RenewalError(types_1.ErrorType.PARSE_ERROR, '未找到进入服务器详情的链接或按钮');
                }
            }
            await delay(2000);
            logger_1.logger.info('ServerLocator', '已通过点击进入服务器详情页面');
        }
        catch (error) {
            logger_1.logger.error('ServerLocator', '通过点击进入服务器详情失败', error);
            throw new types_1.RenewalError(types_1.ErrorType.PARSE_ERROR, `进入服务器详情失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.ServerLocator = ServerLocator;
//# sourceMappingURL=locator.js.map