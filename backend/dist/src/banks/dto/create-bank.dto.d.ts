import { InternalAccountType } from '@prisma/client';
export declare class CreateBankDto {
    bankCode: string;
    bankName: string;
    bankBrand?: string;
    bankAddress?: string;
}
export declare class CreateInternalAccountDto {
    bankId: string;
    userId?: string;
    type: InternalAccountType;
    accountNo: string;
    branch?: string;
    swiftCode?: string;
    holderName: string;
}
