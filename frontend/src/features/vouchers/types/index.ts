import { InternalAccount } from '@/features/banks/types';

export type VoucherCurrency = 'IDR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'MYR' | 'HKD' | 'OTHERS';
export type VoucherPaymentForm = 'BANK' | 'CREDIT_CARD' | 'CASH';
export type VoucherPayerType = 'CUSTOMER' | 'EMPLOYEE' | 'SUPPLIER' | 'OTHERS' | 'UNKNOWN';
export type ReceiveVoucherPurpose =
  | 'INVOICE'
  | 'RETURN_REFUND'
  | 'RETURNING_DEPOSIT'
  | 'RETURNING_CASH_ADVANCE'
  | 'STAFF_LOAN'
  | 'OTHERS'
  | 'UNKNOWN';

export interface InvoiceAllocation {
  id?: string;
  invoiceId: string;
  amountApplied: string;
  ppnWapuDeduction: string;
  pph23Deduction: string;
  bankCharge: string;
  othersAdjustment: string;
  adjustmentDescription?: string | null;
  invoice?: { id: string; code: string; invoiceNumber: string };
}

export interface ReceiveVoucher {
  id: string;
  rvNumber: string;
  rvDate: string;
  currency: VoucherCurrency;
  currencyManual?: string | null;
  amount: string;
  paymentForm: VoucherPaymentForm;
  internalAccountId?: string | null;
  paymentFormValue?: string | null;
  payerType: VoucherPayerType;
  payerId?: string | null;
  payerNameManual?: string | null;
  purpose: ReceiveVoucherPurpose;
  paymentVoucherId?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  internalAccount?: InternalAccount;
  invoices?: InvoiceAllocation[];
}

export interface InvoiceAllocationInput {
  invoiceId: number;
  amountApplied?: number;
  ppnWapuDeduction?: number;
  pph23Deduction?: number;
  bankCharge?: number;
  othersAdjustment?: number;
  adjustmentDescription?: string;
}

export interface CreateReceiveVoucherInput {
  rvNumber: string;
  rvDate: string;
  currency?: VoucherCurrency;
  currencyManual?: string;
  amount: number;
  paymentForm: VoucherPaymentForm;
  internalAccountId?: number;
  paymentFormValue?: string;
  payerType: VoucherPayerType;
  payerId?: number;
  payerNameManual?: string;
  purpose?: ReceiveVoucherPurpose;
  paymentVoucherId?: number;
  description?: string;
  invoiceAllocations?: InvoiceAllocationInput[];
}

export interface UpdateReceiveVoucherInput extends Partial<CreateReceiveVoucherInput> {
  id: string;
}

export interface PaymentVoucher {
  id: string;
  pvNumber: string;
  issuingDate: string;
  dueDate?: string | null;
  currency: string;
  amount: string;
  payableType: string;
  payableId?: string | null;
  payableNameManual?: string | null;
  category: string;
  purchaseOrderId?: string | null;
  expenseType?: string | null;
  description?: string | null;
  sourcePaymentForm: string;
  internalAccountId?: string | null;
  paymentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  internalAccount?: InternalAccount;
}

export interface CreatePaymentVoucherInput {
  pvNumber: string;
  issuingDate: string;
  dueDate?: string;
  currency?: string;
  amount: number;
  payableType: string;
  payableId?: number;
  payableNameManual?: string;
  category: string;
  purchaseOrderId?: number;
  expenseType?: string;
  description?: string;
  sourcePaymentForm: string;
  internalAccountId?: number;
  paymentDate?: string;
}

export interface UpdatePaymentVoucherInput extends Partial<CreatePaymentVoucherInput> {
  id: string;
}
