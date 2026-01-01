import { Page } from 'puppeteer';
import { RenewalResult } from '../types';
export declare class RenewalExecutor {
    private page;
    constructor(page: Page);
    executeRenewal(serverId: string): Promise<RenewalResult>;
    private findAndClickRenewalButton;
    private handleRenewalConfirmation;
    private clickCaptchaArea;
    private performRandomMouseMovement;
    private clickModalRenewButton;
    private waitForRenewalCompletion;
    private verifyRenewalResult;
}
//# sourceMappingURL=renewal.d.ts.map