import { UsersService } from './users.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(query: PaginationQueryDto): Promise<import("../common/interfaces/paginated-result.interface").PaginatedResult<any>>;
}
