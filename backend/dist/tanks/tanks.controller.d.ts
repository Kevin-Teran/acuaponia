import { TanksService } from './tanks.service';
declare class CreateTankDto {
    name: string;
    location: string;
}
export declare class TanksController {
    private readonly tanksService;
    constructor(tanksService: TanksService);
    create(createTankDto: CreateTankDto, req: any): Promise<import("../common/types").ApiResponse<import("../entities/tank.entity").Tank>>;
    findAll(req: any): Promise<import("../common/types").ApiResponse<import("../entities/tank.entity").Tank[]>>;
    findLatest(req: any): Promise<import("../common/types").ApiResponse<import("../entities/tank.entity").Tank>>;
    findOne(id: string): Promise<import("../common/types").ApiResponse<import("../entities/tank.entity").Tank>>;
    remove(id: string): Promise<import("../common/types").ApiResponse<any>>;
}
export {};
