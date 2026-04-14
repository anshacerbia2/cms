import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { Customer, CreateCustomerInput, UpdateCustomerInput, CustomerQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useCustomers = (params: CustomerQueryParams = {}) => {
  const queryClient = useQueryClient();

  // Fetch customers with pagination & search
  const customersQuery = useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Fetch single customer
  const getCustomer = (id: string) =>
    useQuery({
      queryKey: ['customers', id],
      queryFn: async () => {
        const { data } = await api.get<Customer>(`/customers/${id}`);
        return data;
      },
      enabled: !!id,
    });

  // Create customer
  const createCustomerMutation = useMutation({
    mutationFn: async (newCustomer: CreateCustomerInput) => {
      const { data } = await api.post<Customer>('/customers', newCustomer);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Update customer
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateCustomerInput) => {
      const { data } = await api.patch<Customer>(`/customers/${id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Delete customer (soft delete)
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/customers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customersQuery,
    getCustomer,
    createCustomer: createCustomerMutation,
    updateCustomer: updateCustomerMutation,
    deleteCustomer: deleteCustomerMutation,
  };
};
