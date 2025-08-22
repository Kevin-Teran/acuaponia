import { ApiResponse } from '../types';
export declare class ResponseUtil {
    static success<T>(data: T, message?: string): ApiResponse<T>;
    static error(message: string, error?: string): ApiResponse;
}
export declare const calculatePagination: (page: number, limit: number) => {
    skip: number;
    take: number;
};
