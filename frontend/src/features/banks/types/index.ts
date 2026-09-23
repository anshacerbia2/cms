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
  /** The header the finance tables show this account under. */
  displayName?: string | null;
  /** Where it sits when accounts are shown side by side, lowest first. */
  displayOrder?: number | null;
  bank?: Bank;
  createdAt: string;
  updatedAt: string;
  /** No Tax invoices must settle to this account. */
  isNonVatSettlement?: boolean;
  /** Balance of the last fiscal year that has any data: opening + credit - debit. */
  lastBalance?: string | null;
  /** Which fiscal year `lastBalance` belongs to - not every account stops in the same year. */
  lastBalanceYear?: number | null;
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
  displayName?: string;
  displayOrder?: number;
}

export interface UpdateInternalAccountInput extends Partial<CreateInternalAccountInput> {
  id: string;
}
