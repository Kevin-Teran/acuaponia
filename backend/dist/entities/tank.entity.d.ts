import { TankStatus } from '../common/types';
import { User } from './user.entity';
import { Sensor } from './sensor.entity';
export declare class Tank {
    id: string;
    name: string;
    location: string;
    status: TankStatus;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: User;
    sensors: Sensor[];
    constructor(partial?: Partial<Tank>);
    isActive(): boolean;
    setMaintenance(): void;
}
