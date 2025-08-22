"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TanksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tanks_service_1 = require("./tanks.service");
const tanks_controller_1 = require("./tanks.controller");
const tank_entity_1 = require("../entities/tank.entity");
let TanksModule = class TanksModule {
};
exports.TanksModule = TanksModule;
exports.TanksModule = TanksModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([tank_entity_1.Tank])],
        controllers: [tanks_controller_1.TanksController],
        providers: [tanks_service_1.TanksService],
        exports: [tanks_service_1.TanksService],
    })
], TanksModule);
//# sourceMappingURL=tanks.module.js.map