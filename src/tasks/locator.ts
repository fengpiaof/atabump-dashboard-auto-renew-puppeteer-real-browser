/**
 * 服务器定位器
 */

import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { RenewalError, ErrorType } from '../types';

/**
 * 等待指定毫秒数
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ServerInfo {
  id: string;
  name: string;
  element?: any;
  detailUrl?: string;
}

export class ServerLocator {
  private readonly baseUrl = 'https://dashboard.katabump.com';

  constructor(private page: Page) {}

  /**
   * 定位目标服务器
   */
  async locateServer(serverId: string, serverName?: string): Promise<ServerInfo> {
    try {
      logger.info('ServerLocator', `开始定位服务器: ID=${serverId}, Name=${serverName}`);

      // 等待服务器列表加载
      await this.waitForServerList();

      // 尝试多种定位策略
      let serverInfo = await this.locateById(serverId);

      if (!serverInfo && serverName) {
        logger.info('ServerLocator', '未通过 ID 找到服务器,尝试通过名称查找');
        serverInfo = await this.locateByName(serverName);
      }

      if (!serverInfo && serverName) {
        logger.info('ServerLocator', '未通过名称找到服务器,尝试模糊匹配');
        serverInfo = await this.locateByFuzzyMatch(serverId, serverName);
      }

      if (!serverInfo) {
        throw new RenewalError(
          ErrorType.BUSINESS_ERROR,
          `未找到目标服务器: ID=${serverId}, Name=${serverName}`
        );
      }

      logger.info('ServerLocator', `成功定位到服务器: ${serverInfo.name} (${serverInfo.id})`);
      return serverInfo;
    } catch (error) {
      logger.error('ServerLocator', '定位服务器失败', error);
      if (error instanceof RenewalError) {
        throw error;
      }
      throw new RenewalError(
        ErrorType.PARSE_ERROR,
        `定位服务器失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 等待服务器列表加载
   */
  private async waitForServerList(): Promise<void> {
    logger.info('ServerLocator', '等待服务器列表加载...');

    try {
      // 等待常见的列表元素出现
      await this.page.waitForSelector('table, .server-list, .server-card, [data-testid="server-list"]', {
        timeout: 10000,
      });
      logger.info('ServerLocator', '服务器列表已加载');
    } catch (error) {
      throw new RenewalError(
        ErrorType.PARSE_ERROR,
        '未找到服务器列表,可能未在正确的页面'
      );
    }
  }

  /**
   * 通过 ID 定位服务器
   */
  private async locateById(serverId: string): Promise<ServerInfo | null> {
    try {
      // 尝试在表格中查找
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
        return result as ServerInfo;
      }

      // 尝试在卡片列表中查找
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
        return result as ServerInfo;
      }

      return null;
    } catch (error) {
      logger.warn('ServerLocator', '通过 ID 定位服务器失败', error);
      return null;
    }
  }

  /**
   * 通过名称定位服务器
   */
  private async locateByName(serverName: string): Promise<ServerInfo | null> {
    try {
      const result = await this.page.evaluateHandle((name) => {
        // 搜索所有可能包含服务器名称的元素
        const elements = document.querySelectorAll('td, .server-name, h3, h4, [data-server-name]');

        for (const element of elements) {
          const text = element.textContent || '';
          if (text.includes(name)) {
            // 尝试找到对应的 ID
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
        return serverInfo as ServerInfo;
      }

      return null;
    } catch (error) {
      logger.warn('ServerLocator', '通过名称定位服务器失败', error);
      return null;
    }
  }

  /**
   * 模糊匹配定位服务器
   */
  private async locateByFuzzyMatch(serverId: string, serverName: string): Promise<ServerInfo | null> {
    try {
      const result = await this.page.evaluateHandle(({ id, name }) => {
        // 获取所有文本内容
        const allText = document.body.textContent || '';

        // 检查是否包含 ID 或名称的部分
        const idParts = id.split('-');
        const nameParts = name.split('-');

        for (const idPart of idParts) {
          if (idPart.length < 3) continue;
          if (allText.includes(idPart)) {
            return { id, name, found: true };
          }
        }

        for (const namePart of nameParts) {
          if (namePart.length < 3) continue;
          if (allText.includes(namePart)) {
            return { id, name, found: true };
          }
        }

        return null;
      }, { id: serverId, name: serverName });

      if (result) {
        const serverInfo = await result.jsonValue();
        return serverInfo as ServerInfo;
      }

      return null;
    } catch (error) {
      logger.warn('ServerLocator', '模糊匹配定位服务器失败', error);
      return null;
    }
  }

  /**
   * 点击进入服务器详情页面
   */
  async navigateToServerDetail(serverInfo: ServerInfo): Promise<void> {
    try {
      logger.info('ServerLocator', `正在进入服务器详情: ${serverInfo.name}`);

      // 优先使用直接 URL 访问(KataBump 的服务器详情页 URL 格式)
      const detailUrl = `${this.baseUrl}/servers/edit?id=${serverInfo.id}`;

      logger.info('ServerLocator', `使用直接 URL 访问: ${detailUrl}`);
      await this.page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // 等待页面加载完成
      await delay(2000);

      // 验证是否成功进入服务器详情页
      const isDetailPage = await this.page.evaluate(() => {
        const title = document.title;
        const url = window.location.href;
        return title.includes('Your server') || url.includes('/servers/edit');
      });

      if (!isDetailPage) {
        throw new RenewalError(
          ErrorType.PARSE_ERROR,
          '未能进入服务器详情页面'
        );
      }

      logger.info('ServerLocator', '已进入服务器详情页面');
    } catch (error) {
      logger.error('ServerLocator', '进入服务器详情失败', error);

      // 如果直接 URL 访问失败,尝试传统的点击方式
      if (error instanceof RenewalError) {
        throw error;
      }

      logger.info('ServerLocator', '尝试通过点击方式进入详情页...');
      await this.navigateToServerDetailByClick(serverInfo);
    }
  }

  /**
   * 通过点击方式进入服务器详情页面(备用方法)
   */
  private async navigateToServerDetailByClick(serverInfo: ServerInfo): Promise<void> {
    try {
      // 如果有元素引用,直接点击
      if (serverInfo.element) {
        await serverInfo.element.click();
      } else {
        // 否则,通过查找并点击链接或按钮
        const link = await this.page.evaluateHandle((info) => {
          // 查找包含服务器 ID 的链接
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
          // 类型检查并点击
          if (link instanceof this.page.constructor) {
            await (link as any).click();
          } else {
            // 在页面上下文中点击
            await this.page.evaluate((el) => {
              if (el instanceof HTMLElement) {
                el.click();
              }
            }, link);
          }
        } else {
          throw new RenewalError(
            ErrorType.PARSE_ERROR,
            '未找到进入服务器详情的链接或按钮'
          );
        }
      }

      // 等待页面导航
      await delay(2000);
      logger.info('ServerLocator', '已通过点击进入服务器详情页面');
    } catch (error) {
      logger.error('ServerLocator', '通过点击进入服务器详情失败', error);
      throw new RenewalError(
        ErrorType.PARSE_ERROR,
        `进入服务器详情失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
