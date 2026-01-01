/**
 * 登录处理器
 */
import { Page } from 'puppeteer';
import { LoginCredentials } from '../types';
export declare class LoginProcessor {
    private page;
    constructor(page: Page);
    /**
     * 执行登录操作
     */
    login(credentials: LoginCredentials): Promise<boolean>;
    /**
     * 等待页面加载完成
     */
    private waitForPageLoad;
    /**
     * 填写登录表单
     */
    private fillLoginForm;
    /**
     * 提交登录表单
     */
    private submitLogin;
    /**
     * 等待登录结果
     */
    private waitForLoginResult;
    /**
     * 查找元素 (尝试多个选择器)
     */
    private findElement;
}
//# sourceMappingURL=login.d.ts.map