import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';
interface LoginResponse {
    access_token: string;
    user: User;
}
interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<User | null>;
    login(user: User): Promise<LoginResponse>;
    register(email: string, password: string, name: string): Promise<LoginResponse>;
    verifyToken(token: string): Promise<JwtPayload>;
}
export {};
