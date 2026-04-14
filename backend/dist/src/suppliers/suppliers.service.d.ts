import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createSupplierDto: CreateSupplierDto): Promise<{
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
        email: string | null;
        name: string;
        id: bigint;
        phone: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
        email: string | null;
        name: string;
        id: bigint;
        phone: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<({
        pics: {
            email: string | null;
            name: string;
            id: bigint;
            phone: string | null;
            status: import("@prisma/client").$Enums.PicStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            deletedAt: Date | null;
            position: string | null;
            supplierId: bigint;
        }[];
    } & {
        email: string | null;
        name: string;
        id: bigint;
        phone: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }) | null>;
    remove(id: number): Promise<{
        email: string | null;
        name: string;
        id: bigint;
        phone: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    private generateUniqueCode;
}
