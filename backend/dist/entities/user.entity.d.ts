import { UserRole } from '../common/types';
import { Tank } from './tank.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date;
    settings: object;
    tanks: Tank[];
    constructor(partial?: Partial<User>);
    isAdmin(): boolean;
    updateLastLogin(): void;
}
