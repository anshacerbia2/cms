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
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        pics: {
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<({
        pics: {
            id: bigint;
            name: string;
            status: import("@prisma/client").$Enums.PicStatus;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            email: string | null;
            phone: string | null;
            supplierId: bigint;
            position: string | null;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }) | null>;
    remove(id: number): Promise<{
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.SupplierStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        contactPerson: string | null;
        taxNumber: string | null;
    }>;
    private generateUniqueCode;
}
