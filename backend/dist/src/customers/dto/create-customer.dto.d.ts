export declare enum CustomerStatus {
    Active = "Active",
    Inactive = "Inactive"
}
export declare class CreateBillingOptionDto {
    cpName?: string;
    cpTitleDivision?: string;
    cpEmail?: string;
    cpOfficeNumber?: string;
    cpMobileNumber?: string;
    isOverseas?: boolean;
    address?: string;
}
export declare class CreateCustomerPicDto {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    status?: 'active' | 'inactive';
    notes?: string;
}
export declare class CreateCustomerDto {
    name: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    status?: CustomerStatus;
    notes?: string;
    billingOptions?: CreateBillingOptionDto[];
    pics?: CreateCustomerPicDto[];
}
