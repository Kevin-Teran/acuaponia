import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(page?: string, limit?: string): Promise<import("../common/types").ApiResponse<{
        users: import("../entities/user.entity").User[];
        total: number;
    }>>;
    findOne(id: string): Promise<import("../common/types").ApiResponse<import("../entities/user.entity").User>>;
    remove(id: string): Promise<import("../common/types").ApiResponse<any>>;
}
