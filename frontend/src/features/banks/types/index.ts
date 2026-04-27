export interface Bank {
  id: string;
  bankCode: string;
  bankName: string;
  name?: string;
  slug?: string;
  description?: string;
  bankBrand?: string;
  bankAddress?: string;
}

export interface InternalAccount {
  id: string;
  bankId?: string;
  userId?: string;
  type: 'BANK' | 'CASH' | 'OTHER';
  accountNo?: string;
  branch?: string;
  swiftCode?: string;
  holderName: string;
  bank?: Bank;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankInput {
  bankCode: string;
  bankName: string;
  bankBrand?: string;
  bankAddress?: string;
}

export interface CreateInternalAccountInput {
  bankId?: string;
  userId?: string;
  type: 'BANK' | 'CASH' | 'OTHER';
  accountNo?: string;
  branch?: string;
  swiftCode?: string;
  holderName: string;
}

export interface UpdateInternalAccountInput extends Partial<CreateInternalAccountInput> {
  id: string;
}
