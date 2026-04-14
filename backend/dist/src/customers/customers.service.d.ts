import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createCustomerDto: CreateCustomerDto): Promise<{
        billingOptions: {
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            address: string | null;
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            customerId: bigint;
        }[];
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
            position: string | null;
            customerId: bigint;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.CustomerStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        billingOptions: {
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            address: string | null;
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            customerId: bigint;
        }[];
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
            position: string | null;
            customerId: bigint;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.CustomerStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<({
        billingOptions: {
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            address: string | null;
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            customerId: bigint;
        }[];
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
            position: string | null;
            customerId: bigint;
        }[];
    } & {
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.CustomerStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }) | null>;
    remove(id: number): Promise<{
        id: bigint;
        code: string;
        name: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        status: import("@prisma/client").$Enums.CustomerStatus;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    private generateUniqueCode;
}
