"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePagination = exports.ResponseUtil = void 0;
class ResponseUtil {
    static success(data, message = 'Operación exitosa') {
        return {
            success: true,
            message,
            data,
        };
    }
    static error(message, error) {
        return {
            success: false,
            message,
            error,
        };
    }
}
exports.ResponseUtil = ResponseUtil;
const calculatePagination = (page, limit) => {
    if (page < 1 || limit < 1) {
        throw new Error('Page y limit deben ser mayores a 0');
    }
    return {
        skip: (page - 1) * limit,
        take: limit,
    };
};
exports.calculatePagination = calculatePagination;
//# sourceMappingURL=response.util.js.map