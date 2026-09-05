import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ReceiveVoucher,
  CreateReceiveVoucherInput,
  UpdateReceiveVoucherInput,
  PaymentVoucher,
  CreatePaymentVoucherInput,
  UpdatePaymentVoucherInput,
} from '../types';
import { PaginatedResponse } from '@/types/pagination';

interface VoucherQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  purpose?: string;
  payerType?: string;
  invoiceId?: number;
  category?: string;
}

export const useReceiveVouchers = (params: VoucherQueryParams = {}) => {
  const queryClient = useQueryClient();

  const receiveVouchersQuery = useQuery({
    queryKey: ['receive-vouchers', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReceiveVoucher>>('/receive-vouchers', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Applying cash rewrites the invoice's balance due and payment status.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['receive-vouchers'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const createReceiveVoucher = useMutation({
    mutationFn: async (input: CreateReceiveVoucherInput) => {
      const { data } = await api.post<ReceiveVoucher>('/receive-vouchers', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateReceiveVoucher = useMutation({
    mutationFn: async ({ id, ...input }: UpdateReceiveVoucherInput) => {
      const { data } = await api.patch<ReceiveVoucher>(`/receive-vouchers/${id}`, input);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteReceiveVoucher = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/receive-vouchers/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { receiveVouchersQuery, createReceiveVoucher, updateReceiveVoucher, deleteReceiveVoucher };
};

export const useReceiveVoucher = (id?: string | null) =>
  useQuery({
    queryKey: ['receive-vouchers', id],
    queryFn: async () => {
      const { data } = await api.get<ReceiveVoucher>(`/receive-vouchers/${id}`);
      return data;
    },
    enabled: !!id,
  });

export const usePaymentVouchers = (params: VoucherQueryParams = {}) => {
  const queryClient = useQueryClient();

  const paymentVouchersQuery = useQuery({
    queryKey: ['payment-vouchers', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PaymentVoucher>>('/payment-vouchers', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] });

  const createPaymentVoucher = useMutation({
    mutationFn: async (input: CreatePaymentVoucherInput) => {
      const { data } = await api.post<PaymentVoucher>('/payment-vouchers', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const updatePaymentVoucher = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePaymentVoucherInput) => {
      const { data } = await api.patch<PaymentVoucher>(`/payment-vouchers/${id}`, input);
      return data;
    },
    onSuccess: invalidate,
  });

  const deletePaymentVoucher = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/payment-vouchers/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { paymentVouchersQuery, createPaymentVoucher, updatePaymentVoucher, deletePaymentVoucher };
};
