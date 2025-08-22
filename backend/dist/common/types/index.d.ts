export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface DateRange {
    startDate: Date;
    endDate: Date;
}
export declare enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}
export declare enum TankStatus {
    ACTIVE = "ACTIVE",
    MAINTENANCE = "MAINTENANCE",
    INACTIVE = "INACTIVE"
}
export declare enum SensorType {
    TEMPERATURE = "TEMPERATURE",
    PH = "PH",
    OXYGEN = "OXYGEN"
}
export declare enum SensorStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    MAINTENANCE = "MAINTENANCE",
    ERROR = "ERROR"
}
