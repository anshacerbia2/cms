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
                    id: bigint;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    method: string | null;
                    route: string;
                    path: string | null;
                };
            } & {
                roleId: bigint;
                createdAt: Date;
                updatedAt: Date;
                permissionId: bigint;
            })[];
        } & {
            name: string;
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            description: string | null;
        }) | null;
    } & {
        email: string;
        name: string;
        id: bigint;
        emailVerifiedAt: Date | null;
        password: string;
        phone: string | null;
        location: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        roleId: bigint | null;
        rememberToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findById(id: number): Promise<({
        role: ({
            permissions: ({
                permission: {
                    id: bigint;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    method: string | null;
                    route: string;
                    path: string | null;
                };
            } & {
                roleId: bigint;
                createdAt: Date;
                updatedAt: Date;
                permissionId: bigint;
            })[];
        } & {
            name: string;
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            description: string | null;
        }) | null;
    } & {
        email: string;
        name: string;
        id: bigint;
        emailVerifiedAt: Date | null;
        password: string;
        phone: string | null;
        location: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        roleId: bigint | null;
        rememberToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
}
