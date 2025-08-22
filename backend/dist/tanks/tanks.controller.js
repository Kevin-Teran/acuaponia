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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TanksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tanks_service_1 = require("./tanks.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const response_util_1 = require("../common/utils/response.util");
class CreateTankDto {
}
let TanksController = class TanksController {
    constructor(tanksService) {
        this.tanksService = tanksService;
    }
    async create(createTankDto, req) {
        const tank = await this.tanksService.create({
            ...createTankDto,
            userId: req.user.id,
        });
        return response_util_1.ResponseUtil.success(tank, 'Tanque creado exitosamente');
    }
    async findAll(req) {
        const tanks = await this.tanksService.findByUserId(req.user.id);
        return response_util_1.ResponseUtil.success(tanks, 'Tanques obtenidos exitosamente');
    }
    async findLatest(req) {
        const tank = await this.tanksService.findLatestByUserId(req.user.id);
        return response_util_1.ResponseUtil.success(tank, 'Tanque más reciente obtenido');
    }
    async findOne(id) {
        const tank = await this.tanksService.findById(id);
        return response_util_1.ResponseUtil.success(tank, 'Tanque encontrado');
    }
    async remove(id) {
        await this.tanksService.remove(id);
        return response_util_1.ResponseUtil.success(null, 'Tanque eliminado exitosamente');
    }
};
exports.TanksController = TanksController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo tanque' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tanque creado exitosamente' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTankDto, Object]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener tanques del usuario' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tanques obtenidos exitosamente' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener tanque más reciente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tanque más reciente obtenido' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "findLatest", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener tanque por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tanque encontrado' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tanque no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar tanque' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tanque eliminado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tanque no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "remove", null);
exports.TanksController = TanksController = __decorate([
    (0, swagger_1.ApiTags)('tanks'),
    (0, common_1.Controller)('tanks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [tanks_service_1.TanksService])
], TanksController);
//# sourceMappingURL=tanks.controller.js.map