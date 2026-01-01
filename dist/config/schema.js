"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
function validateConfig(config) {
    const errors = [];
    if (!config.credentials) {
        errors.push('缺少 credentials 字段');
    }
    else {
        if (!config.credentials.username) {
            errors.push('缺少 credentials.username 字段');
        }
        if (!config.credentials.password) {
            errors.push('缺少 credentials.password 字段');
        }
    }
    if (!config.targetUrl) {
        errors.push('缺少 targetUrl 字段');
    }
    if (!config.servers || config.servers.length === 0) {
        errors.push('缺少 servers 字段或 servers 为空');
    }
    else {
        config.servers.forEach((server, index) => {
            if (!server.id) {
                errors.push(`服务器 [${index}] 缺少 id 字段`);
            }
        });
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=schema.js.map