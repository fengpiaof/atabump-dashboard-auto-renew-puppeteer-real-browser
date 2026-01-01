import { Page } from 'puppeteer';
import { LoginCredentials } from '../types';
export declare class LoginProcessor {
    private page;
    constructor(page: Page);
    login(credentials: LoginCredentials): Promise<boolean>;
    private waitForPageLoad;
    private fillLoginForm;
    private submitLogin;
    private waitForLoginResult;
    private findElement;
}
//# sourceMappingURL=login.d.ts.map