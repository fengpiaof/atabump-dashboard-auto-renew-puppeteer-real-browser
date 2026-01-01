"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenewalError = exports.ErrorType = void 0;
/**
 * 错误类型
 */
var ErrorType;
(function (ErrorType) {
    ErrorType["CONFIG_ERROR"] = "CONFIG_ERROR";
    ErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorType["BROWSER_ERROR"] = "BROWSER_ERROR";
    ErrorType["PARSE_ERROR"] = "PARSE_ERROR";
    ErrorType["VERIFY_ERROR"] = "VERIFY_ERROR";
    ErrorType["BUSINESS_ERROR"] = "BUSINESS_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * 自定义错误类
 */
class RenewalError extends Error {
    constructor(type, message, code) {
        super(message);
        this.type = type;
        this.code = code;
        this.name = 'RenewalError';
    }
}
exports.RenewalError = RenewalError;
//# sourceMappingURL=index.js.map