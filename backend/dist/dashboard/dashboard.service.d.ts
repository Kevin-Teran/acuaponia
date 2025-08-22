import { TanksService } from '../tanks/tanks.service';
import { DateRange } from '../common/types';
interface DashboardData {
    tanks: any[];
    selectedTank: any;
    sensorData: any[];
    alerts: any[];
}
interface DashboardFilters {
    userId?: string;
    tankId?: string;
    dateRange: DateRange;
}
export declare class DashboardService {
    private readonly tanksService;
    constructor(tanksService: TanksService);
    getDashboardData(userId: string, filters: DashboardFilters): Promise<DashboardData>;
    private generateMockSensorData;
    private generateMockAlerts;
}
export {};
