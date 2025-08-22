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
exports.Tank = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("../common/types");
const user_entity_1 = require("./user.entity");
const sensor_entity_1 = require("./sensor.entity");
let Tank = class Tank {
    constructor(partial) {
        Object.assign(this, partial);
    }
    isActive() {
        return this.status === types_1.TankStatus.ACTIVE;
    }
    setMaintenance() {
        this.status = types_1.TankStatus.MAINTENANCE;
    }
};
exports.Tank = Tank;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tank.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Tank.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Tank.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.TankStatus,
        default: types_1.TankStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Tank.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Tank.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Tank.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Tank.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.tanks),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], Tank.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sensor_entity_1.Sensor, sensor => sensor.tank),
    __metadata("design:type", Array)
], Tank.prototype, "sensors", void 0);
exports.Tank = Tank = __decorate([
    (0, typeorm_1.Entity)('tanks'),
    __metadata("design:paramtypes", [Object])
], Tank);
//# sourceMappingURL=tank.entity.js.map