"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const tanks_service_1 = require("../tanks/tanks.service");
let DashboardService = class DashboardService {
    constructor(tanksService) {
        this.tanksService = tanksService;
    }
    async getDashboardData(userId, filters) {
        const tanks = await this.tanksService.findByUserId(userId);
        let selectedTank;
        if (filters.tankId) {
            selectedTank = await this.tanksService.findById(filters.tankId);
        }
        else {
            selectedTank = await this.tanksService.findLatestByUserId(userId);
        }
        const sensorData = this.generateMockSensorData(filters.dateRange);
        const alerts = this.generateMockAlerts();
        return {
            tanks,
            selectedTank,
            sensorData,
            alerts,
        };
    }
    generateMockSensorData(dateRange) {
        const data = [];
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
            data.push({
                timestamp: new Date(d),
                temperature: 22 + Math.random() * 6,
                ph: 6.5 + Math.random() * 1.5,
                oxygen: 5 + Math.random() * 3,
            });
        }
        return data;
    }
    generateMockAlerts() {
        return [
            {
                id: '1',
                type: 'TEMPERATURE_HIGH',
                severity: 'MEDIUM',
                message: 'Temperatura alta detectada en Tanque Principal',
                timestamp: new Date(),
                resolved: false,
            },
            {
                id: '2',
                type: 'PH_LOW',
                severity: 'LOW',
                message: 'Nivel de pH bajo en Tanque Secundario',
                timestamp: new Date(Date.now() - 3600000),
                resolved: false,
            },
        ];
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tanks_service_1.TanksService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map