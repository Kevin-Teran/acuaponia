import { SensorType, SensorStatus } from '../common/types';
import { Tank } from './tank.entity';
export declare class Sensor {
    id: string;
    hardwareId: string;
    name: string;
    type: SensorType;
    location: string;
    status: SensorStatus;
    calibrationDate: Date;
    lastReading: number;
    lastUpdate: Date;
    createdAt: Date;
    updatedAt: Date;
    tankId: string;
    tank: Tank;
    constructor(partial?: Partial<Sensor>);
    isOperational(): boolean;
    updateReading(value: number): void;
    needsCalibration(daysThreshold?: number): boolean;
}
