import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findByEmail(email: string): Promise<({
        role: ({
            permissions: ({
                permission: {
                    path: string | null;
                    id: bigint;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    route: string;
                    method: string | null;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                roleId: bigint;
                permissionId: bigint;
            })[];
        } & {
            id: bigint;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            description: string | null;
        }) | null;
    } & {
        id: bigint;
        name: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        roleId: bigint | null;
        email: string;
        emailVerifiedAt: Date | null;
        password: string;
        phone: string | null;
        location: string | null;
        rememberToken: string | null;
    }) | null>;
    findById(id: number): Promise<({
        role: ({
            permissions: ({
                permission: {
                    path: string | null;
                    id: bigint;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    route: string;
                    method: string | null;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                roleId: bigint;
                permissionId: bigint;
            })[];
        } & {
            id: bigint;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            description: string | null;
        }) | null;
    } & {
        id: bigint;
        name: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        roleId: bigint | null;
        email: string;
        emailVerifiedAt: Date | null;
        password: string;
        phone: string | null;
        location: string | null;
        rememberToken: string | null;
    }) | null>;
}
