import { Project } from '@/features/projects/types';
import { Proposal, SalesItem } from '@/features/proposals/types';
import { InternalAccount } from '@/features/banks/types';
import { BillingOption, Customer } from '@/features/customers/types';

export type InvoiceBillingType = 'PARTLY_PAYMENT' | 'FULL_AMOUNT';
export type InvoiceTaxType = 'NO_TAX' | 'TAX_NON_WAPU' | 'TAX_WAPU';
export type InvoiceStatus = 'VOID' | 'REVISED' | 'PREPARED' | 'SENT';
export type InvoicePaymentStatus = 'UNPAID' | 'PARTLY_PAID' | 'FULLY_PAID';
export type ManagementFeeType = 'NOMINAL' | 'PERCENT';

export interface InvoiceReceiveVoucherLink {
  id: string;
  invoiceId: string;
  receiveVoucherId: string;
  amountApplied: string;
  ppnWapuDeduction: string;
  pph23Deduction: string;
  bankCharge: string;
  othersAdjustment: string;
  adjustmentDescription?: string | null;
  receiveVoucher?: {
    id: string;
    rvNumber: string;
    rvDate: string;
    amount: string;
  };
}

export interface Invoice {
  id: string;
  code: string;
  invoiceNumber: string;
  dueDate: string;
  projectId?: string | null;
  proposalId?: string | null;
  customerId: string;
  billingOptionId?: string | null;
  internalAccountId?: string | null;
  salesCode?: string | null;
  projectName?: string | null;
  projectDescription?: string | null;
  description?: string | null;
  billingType: InvoiceBillingType;
  taxType: InvoiceTaxType;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  managementFeeType: ManagementFeeType;
  managementFee: string;
  vatRate: number;
  totalAmount: string;
  balanceDue: string;
  totalReceivedAmount: string;
  totalPph23Deduction: string;
  totalBankCharge: string;
  createdAt: string;
  updatedAt: string;

  customer?: Customer;
  project?: Project;
  proposal?: Proposal;
  billingOption?: BillingOption;
  internalAccount?: InternalAccount;
  salesItems?: SalesItem[];
  receiveVouchers?: InvoiceReceiveVoucherLink[];
  _count?: { salesItems: number; receiveVouchers: number };

  /** Appended by the backend: base -> fee -> sales amount -> VAT -> invoice amount. */
  managementFeeAmount: number;
  salesAmount: number;
  vatAmount: number;
  invoiceAmount: number;
}

export interface CreateInvoiceInput {
  proposalId?: number;
  projectId?: number;
  customerId: number;
  billingOptionId?: number;
  internalAccountId?: number;
  invoiceNumber: string;
  dueDate: string;
  description?: string;
  billingType: InvoiceBillingType;
  taxType: InvoiceTaxType;
  status?: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  itemIds?: number[];
  totalAmount?: number;
  managementFeeType?: ManagementFeeType;
  managementFee?: number;
  vatRate?: number;
}

export interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  id: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  projectId?: number;
  proposalId?: number;
  status?: InvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  unpaid?: string;
}
