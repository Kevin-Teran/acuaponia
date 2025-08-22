import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/types';
interface CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(page?: number, limit?: number): Promise<{
        users: User[];
        total: number;
    }>;
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    updateLastLogin(id: string): Promise<void>;
    remove(id: string): Promise<void>;
}
export {};
