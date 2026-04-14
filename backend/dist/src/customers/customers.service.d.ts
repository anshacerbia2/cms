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
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            address: string | null;
            customerId: bigint;
        }[];
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
            customerId: bigint;
        }[];
    } & {
        name: string;
        id: bigint;
        status: import("@prisma/client").$Enums.CustomerStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
    }>;
    findAll(query: PaginationQueryDto): Promise<PaginatedResult<any>>;
    findOne(id: number): Promise<{
        billingOptions: {
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            address: string | null;
            customerId: bigint;
        }[];
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
            customerId: bigint;
        }[];
    } & {
        name: string;
        id: bigint;
        status: import("@prisma/client").$Enums.CustomerStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
    }>;
    update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<({
        billingOptions: {
            id: bigint;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            cpName: string | null;
            cpTitleDivision: string | null;
            cpEmail: string | null;
            cpOfficeNumber: string | null;
            cpMobileNumber: string | null;
            isOverseas: boolean;
            address: string | null;
            customerId: bigint;
        }[];
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
            customerId: bigint;
        }[];
    } & {
        name: string;
        id: bigint;
        status: import("@prisma/client").$Enums.CustomerStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
    }) | null>;
    remove(id: number): Promise<{
        name: string;
        id: bigint;
        status: import("@prisma/client").$Enums.CustomerStatus;
        createdAt: Date;
        updatedAt: Date;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        notes: string | null;
        code: string;
        deletedAt: Date | null;
    }>;
    private generateUniqueCode;
}
