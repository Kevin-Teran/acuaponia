import { Repository } from 'typeorm';
import { Tank } from '../entities/tank.entity';
import { TankStatus } from '../common/types';
interface CreateTankDto {
    name: string;
    location: string;
    userId: string;
}
export declare class TanksService {
    private readonly tankRepository;
    constructor(tankRepository: Repository<Tank>);
    create(createTankDto: CreateTankDto): Promise<Tank>;
    findByUserId(userId: string): Promise<Tank[]>;
    findLatestByUserId(userId: string): Promise<Tank | null>;
    findById(id: string): Promise<Tank>;
    updateStatus(id: string, status: TankStatus): Promise<Tank>;
    remove(id: string): Promise<void>;
}
export {};
