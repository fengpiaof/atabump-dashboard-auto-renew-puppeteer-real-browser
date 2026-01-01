/**
 * 续期执行器
 */

import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { RenewalError, ErrorType, RenewalResult } from '../types';

/**
 * 等待指定毫秒数
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RenewalExecutor {
  constructor(private page: Page) {}

  /**
   * 执行续期操作
   */
  async executeRenewal(serverId: string): Promise<RenewalResult> {
    try {
      logger.info('RenewalExecutor', `开始执行服务器续期: ${serverId}`);

      // 查找并点击续期按钮
      await this.findAndClickRenewalButton();

      // 等待续期确认对话框
      await this.handleRenewalConfirmation();

      // 等待续期处理完成
      await this.waitForRenewalCompletion();

      // 验证续期结果
      const result = await this.verifyRenewalResult(serverId);

      logger.info('RenewalExecutor', `服务器续期${result.success ? '成功' : '失败'}: ${serverId}`);
      return result;
    } catch (error) {
      logger.error('RenewalExecutor', '续期操作失败', error);

      return {
        success: false,
        serverId,
        message: `续期操作失败: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          code: error instanceof RenewalError ? error.type : 'UNKNOWN',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * 查找并点击续期按钮
   * KataBump 续期按钮: button.btn.btn-outline-primary with text "Renew"
   * 或者直接提交续期表单: form[action*="renew"]
   */
  private async findAndClickRenewalButton(): Promise<void> {
    logger.info('RenewalExecutor', '正在查找续期按钮...');

    let buttonFound = false;

    // 优先尝试直接提交续期表单
    try {
      const renewForm = await this.page.$('form[action*="renew"]');
      if (renewForm) {
        await renewForm.evaluate((form: HTMLFormElement) => {
          // 查找表单内的提交按钮
          const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.click();
          } else {
            form.submit();
          }
        });
        buttonFound = true;
        logger.info('RenewalExecutor', '已通过表单提交续期请求');
      }
    } catch (error) {
      logger.warn('RenewalExecutor', '表单提交失败,尝试其他方式', error);
    }

    // 如果表单提交失败,尝试点击 "Renew" 按钮
    if (!buttonFound) {
      const renewalButtonSelectors = [
        'button.btn-outline-primary:has-text("Renew")',
        'button.btn-primary:has-text("Renew")',
        'button.btn:has-text("Renew")',
        'button:has-text("Renew")',
      ];

      for (const selector of renewalButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            buttonFound = true;
            logger.info('RenewalExecutor', `已点击续期按钮: ${selector}`);
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
    }

    // 如果还是没找到,尝试通过文本内容查找
    if (!buttonFound) {
      const found = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toLowerCase() || '';

          // 查找包含 "renew" 的按钮
          if (text === 'renew' || text === 'renew ') {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (found) {
        buttonFound = true;
        logger.info('RenewalExecutor', '已通过文本内容点击续期按钮');
      }
    }

    if (!buttonFound) {
      throw new RenewalError(
        ErrorType.PARSE_ERROR,
        '未找到续期按钮,可能页面结构已变化'
      );
    }

    // 等待一下,让页面响应
    await delay(1000);
  }

  /**
   * 处理续期确认对话框
   */
  private async handleRenewalConfirmation(): Promise<void> {
    logger.info('RenewalExecutor', '等待续期确认对话框...');

    try {
      // 等待可能出现的确认对话框
      await delay(2000);

      // 检查是否有确认按钮
      const confirmButtonSelectors = [
        'button:has-text("确认")',
        'button:has-text("Confirm")',
        'button:has-text("确定")',
        'button:has-text("OK")',
        'button[type="submit"]',
        '.confirm-button',
      ];

      let confirmationHandled = false;

      for (const selector of confirmButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button && await button.isIntersectingViewport()) {
            await button.click();
            confirmationHandled = true;
            logger.info('RenewalExecutor', '已点击确认按钮');
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      // 如果没找到确认按钮,可能直接进入处理流程
      if (!confirmationHandled) {
        logger.info('RenewalExecutor', '未找到确认对话框,可能直接进入处理流程');
      }

      await delay(1000);
    } catch (error) {
      logger.warn('RenewalExecutor', '处理确认对话框时出错,可能不需要确认', error);
    }
  }

  /**
   * 等待续期处理完成
   */
  private async waitForRenewalCompletion(): Promise<void> {
    logger.info('RenewalExecutor', '等待续期处理完成...');

    try {
      // 等待网络空闲或成功提示
      await this.page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 15000,
      }).catch(() => {
        // 可能没有页面跳转
      });

      // 额外等待一下,确保处理完成
      await delay(2000);

      logger.info('RenewalExecutor', '续期处理完成');
    } catch (error) {
      logger.warn('RenewalExecutor', '等待续期完成超时,尝试继续验证', error);
    }
  }

  /**
   * 验证续期结果
   */
  private async verifyRenewalResult(serverId: string): Promise<RenewalResult> {
    logger.info('RenewalExecutor', '验证续期结果...');

    try {
      // 检查是否有成功提示
      const successIndicators = [
        '续期成功',
        'renewal successful',
        'renewed successfully',
        '操作成功',
        'success',
      ];

      const hasSuccessMessage = await this.page.evaluate((indicators) => {
        const pageText = document.body.textContent?.toLowerCase() || '';
        return indicators.some((indicator) => pageText.includes(indicator.toLowerCase()));
      }, successIndicators);

      // 检查是否有错误提示
      const errorIndicators = [
        '续期失败',
        'renewal failed',
        'error',
        '错误',
        'failed',
      ];

      const hasErrorMessage = await this.page.evaluate((indicators) => {
        const pageText = document.body.textContent?.toLowerCase() || '';
        return indicators.some((indicator) => pageText.includes(indicator.toLowerCase()));
      }, errorIndicators);

      if (hasSuccessMessage && !hasErrorMessage) {
        return {
          success: true,
          serverId,
          message: '续期成功',
        };
      }

      if (hasErrorMessage) {
        return {
          success: false,
          serverId,
          message: '续期失败: 页面显示错误信息',
        };
      }

      // 如果没有明确的成功或失败提示,检查租期信息
      const expiryInfo = await this.page.evaluate(() => {
        const expirySelectors = [
          '.expiry-date',
          '.renewal-date',
          '[data-expiry]',
          'td:has-text("到期")',
          'td:has-text("Expire")',
        ];

        for (const selector of expirySelectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent?.trim();
          }
        }
        return null;
      });

      if (expiryInfo) {
        return {
          success: true,
          serverId,
          message: '续期成功',
          details: {
            newExpiryDate: expiryInfo,
          },
        };
      }

      // 默认认为成功
      return {
        success: true,
        serverId,
        message: '续期操作已执行,未检测到错误',
      };
    } catch (error) {
      logger.error('RenewalExecutor', '验证续期结果时出错', error);

      return {
        success: false,
        serverId,
        message: `验证续期结果失败: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          code: ErrorType.VERIFY_ERROR,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }
}
