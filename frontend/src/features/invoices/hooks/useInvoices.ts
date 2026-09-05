import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { Invoice, CreateInvoiceInput, UpdateInvoiceInput, InvoiceQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useInvoices = (params: InvoiceQueryParams = {}) => {
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Invoice>>('/invoices', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Billing an item consumes it from its proposal, so proposal lists go stale too.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const createInvoice = useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data } = await api.post<Invoice>('/invoices', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...input }: UpdateInvoiceInput) => {
      const { data } = await api.patch<Invoice>(`/invoices/${id}`, input);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/invoices/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return { invoicesQuery, createInvoice, updateInvoice, deleteInvoice };
};

export const useInvoice = (id?: string | null) =>
  useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data } = await api.get<Invoice>(`/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });

/** Everything not yet FULLY_PAID — the allocation picker on a receive voucher. */
export const useUnpaidInvoices = (enabled = true) =>
  useQuery({
    queryKey: ['invoices', 'unpaid'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Invoice>>('/invoices', {
        params: { unpaid: 'true', limit: 100 },
      });
      return data.data;
    },
    enabled,
  });
