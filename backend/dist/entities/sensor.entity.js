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
exports.Sensor = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("../common/types");
const tank_entity_1 = require("./tank.entity");
let Sensor = class Sensor {
    constructor(partial) {
        Object.assign(this, partial);
    }
    isOperational() {
        return this.status === types_1.SensorStatus.ACTIVE;
    }
    updateReading(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('El valor de lectura debe ser un número válido');
        }
        this.lastReading = value;
        this.lastUpdate = new Date();
    }
    needsCalibration(daysThreshold = 30) {
        const daysSinceCalibration = Math.floor((Date.now() - this.calibrationDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCalibration > daysThreshold;
    }
};
exports.Sensor = Sensor;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Sensor.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Sensor.prototype, "hardwareId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Sensor.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.SensorType,
    }),
    __metadata("design:type", String)
], Sensor.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Sensor.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: types_1.SensorStatus,
        default: types_1.SensorStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Sensor.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Sensor.prototype, "calibrationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Sensor.prototype, "lastReading", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Sensor.prototype, "lastUpdate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Sensor.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Sensor.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Sensor.prototype, "tankId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tank_entity_1.Tank, tank => tank.sensors),
    (0, typeorm_1.JoinColumn)({ name: 'tankId' }),
    __metadata("design:type", tank_entity_1.Tank)
], Sensor.prototype, "tank", void 0);
exports.Sensor = Sensor = __decorate([
    (0, typeorm_1.Entity)('sensors'),
    __metadata("design:paramtypes", [Object])
], Sensor);
//# sourceMappingURL=sensor.entity.js.map