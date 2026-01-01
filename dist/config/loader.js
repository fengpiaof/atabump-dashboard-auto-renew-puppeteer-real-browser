"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
class ConfigLoader {
    static loadFromFile(configPath) {
        if (!fs.existsSync(configPath)) {
            throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, `配置文件不存在: ${configPath}`);
        }
        const configContent = fs.readFileSync(configPath, 'utf-8');
        let config;
        try {
            config = JSON.parse(configContent);
        }
        catch (error) {
            throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, `配置文件格式错误: ${error instanceof Error ? error.message : String(error)}`);
        }
        return this.validateAndNormalize(config);
    }
    static loadFromObject(configObj) {
        return this.validateAndNormalize(configObj);
    }
    static validateAndNormalize(config) {
        if (!config.credentials?.username || !config.credentials?.password) {
            throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, '缺少登录凭证 (credentials.username 和 credentials.password 为必填项)');
        }
        if (!config.targetUrl) {
            throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, '缺少目标URL (targetUrl 为必填项)');
        }
        if (!config.servers || config.servers.length === 0) {
            throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, '缺少服务器配置 (servers 为必填项且不能为空)');
        }
        for (const server of config.servers) {
            if (!server.id) {
                throw new types_1.RenewalError(types_1.ErrorType.CONFIG_ERROR, '服务器配置中缺少 id 字段');
            }
        }
        const normalizedConfig = {
            ...config,
            browser: {
                ...config.browser,
                headless: config.browser?.headless ?? true,
                timeout: config.browser?.timeout ?? 30000,
                waitUntil: config.browser?.waitUntil ?? 'networkidle0',
                windowWidth: config.browser?.windowWidth ?? 1920,
                windowHeight: config.browser?.windowHeight ?? 1080,
            },
            retry: {
                ...config.retry,
                maxRetries: config.retry?.maxRetries ?? 3,
                retryInterval: config.retry?.retryInterval ?? 5000,
                retryOnTimeout: config.retry?.retryOnTimeout ?? true,
                exponentialBackoff: config.retry?.exponentialBackoff ?? false,
                maxRetryInterval: config.retry?.maxRetryInterval ?? 60000,
                retryableErrors: config.retry?.retryableErrors ?? [],
            },
            notifications: {
                ...config.notifications,
                enableEmail: config.notifications?.enableEmail ?? false,
                enableWebhook: config.notifications?.enableWebhook ?? false,
                enableStdout: config.notifications?.enableStdout ?? true,
            },
        };
        return normalizedConfig;
    }
    static getDefaultTemplate() {
        return {
            targetUrl: 'https://dashboard.example.com/dashboard',
            credentials: {
                username: 'your-email@example.com',
                password: 'your-password',
            },
            servers: [
                {
                    id: 'server-id-1',
                    name: 'My Server 1',
                },
            ],
            browser: {
                headless: true,
                timeout: 30000,
                waitUntil: 'networkidle0',
                windowWidth: 1920,
                windowHeight: 1080,
            },
            retry: {
                maxRetries: 3,
                retryInterval: 5000,
                retryOnTimeout: true,
            },
            notifications: {
                enableEmail: false,
                enableWebhook: false,
                enableStdout: true,
            },
        };
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=loader.js.map