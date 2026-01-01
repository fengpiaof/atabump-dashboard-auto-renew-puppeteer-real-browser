/**
 * 续期执行器
 */
import { Page } from 'puppeteer';
import { RenewalResult } from '../types';
export declare class RenewalExecutor {
    private page;
    constructor(page: Page);
    /**
     * 执行续期操作
     */
    executeRenewal(serverId: string): Promise<RenewalResult>;
    /**
     * 查找并点击续期按钮
     * KataBump 续期按钮: button.btn.btn-outline-primary with text "Renew"
     * 或者直接提交续期表单: form[action*="renew"]
     */
    private findAndClickRenewalButton;
    /**
     * 处理续期确认对话框
     */
    private handleRenewalConfirmation;
    /**
     * 等待续期处理完成
     */
    private waitForRenewalCompletion;
    /**
     * 验证续期结果
     */
    private verifyRenewalResult;
}
//# sourceMappingURL=renewal.d.ts.map