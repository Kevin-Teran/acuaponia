"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const tanks_module_1 = require("./tanks/tanks.module");
const sensors_module_1 = require("./sensors/sensors.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const analytics_module_1 = require("./analytics/analytics.module");
const reports_module_1 = require("./reports/reports.module");
const predictions_module_1 = require("./predictions/predictions.module");
const ai_assistant_module_1 = require("./ai-assistant/ai-assistant.module");
const data_entry_module_1 = require("./data-entry/data-entry.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 3306,
                username: process.env.DB_USERNAME || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_DATABASE || 'acuaponia',
                autoLoadEntities: true,
                synchronize: process.env.NODE_ENV !== 'production',
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            tanks_module_1.TanksModule,
            sensors_module_1.SensorsModule,
            dashboard_module_1.DashboardModule,
            analytics_module_1.AnalyticsModule,
            reports_module_1.ReportsModule,
            predictions_module_1.PredictionsModule,
            ai_assistant_module_1.AiAssistantModule,
            data_entry_module_1.DataEntryModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map