export interface BillingOption {
  id: string;
  customerId: string;
  cpName?: string;
  cpTitleDivision?: string;
  cpEmail?: string;
  cpOfficeNumber?: string;
  cpMobileNumber?: string;
  isOverseas: boolean;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPic {
  id: string;
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  billingOptions?: BillingOption[];
  pics?: CustomerPic[];
  _count?: {
    billingOptions: number;
    pics: number;
  };
}

export interface CustomerResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerInput {
  name: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  status?: 'Active' | 'Inactive';
  notes?: string;
  billingOptions?: Partial<Omit<BillingOption, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>[];
  pics?: Partial<Omit<CustomerPic, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>[];
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}
