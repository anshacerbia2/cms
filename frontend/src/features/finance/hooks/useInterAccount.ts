import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';

interface FetchParams {
  page: number;
  limit?: number;
  search?: string;
  year?: number;
}

export const interAccountService = {
  getInterAccountById: async (id: number): Promise<any> => {
    const { data } = await api.get(`/finance/inter-account/${id}`);
    return data;
  },
  updateInterAccount: async (id: number, payload: any): Promise<any> => {
    const { data } = await api.patch(`/finance/inter-account/${id}`, payload);
    return data;
  },
  deleteInterAccount: async (id: number): Promise<any> => {
    const { data } = await api.delete(`/finance/inter-account/${id}`);
    return data;
  },
  createInterAccount: async (payload: any): Promise<any> => {
    const { data } = await api.post(`/finance/inter-account`, payload);
    return data;
  },
  createBulkInterAccount: async (payload: any): Promise<any> => {
    const { data } = await api.post(`/finance/inter-account/bulk`, payload);
    return data;
  }
};

export const useInterAccount = ({ page, limit = 10, search, year }: FetchParams) => {
  const queryClient = useQueryClient();
  const getInterAccount = useQuery({
    queryKey: ['inter-account', page, limit, search, year],
    queryFn: async () => {
      const { data } = await api.get('/finance/inter-account/paginated', {
        params: { page, limit, search, year },
      });
      return data;
    },
  });

  const getInterAccountById = (id: number | null, options?: any) => 
    useQuery<any>({
      queryKey: ["inter-account", id],
      queryFn: () => interAccountService.getInterAccountById(id!),
      enabled: !!id,
      ...options,
    });

  const updateInterAccount = useMutation({
      mutationFn: ({ id, data }: { id: number, data: any }) => interAccountService.updateInterAccount(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["inter-account"] });
      }
    });

  const deleteInterAccount = useMutation({
      mutationFn: (id: number) => interAccountService.deleteInterAccount(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["inter-account"] });
        toast.success("Inter-Account record deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete record");
      }
    });

  const createInterAccount = useMutation({
      mutationFn: (data: any) => interAccountService.createInterAccount(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["inter-account"] });
        toast.success("Inter Account record created successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to create inter account record");
      }
    });

  const createBulkInterAccount = useMutation({
    mutationFn: (payload: any) => interAccountService.createBulkInterAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-account'] });
      toast.success('Bulk import successful');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to perform bulk import');
    }
  });

  return {
    data: getInterAccount.data,
    isLoading: getInterAccount.isLoading,
    refetch: getInterAccount.refetch,
    getInterAccountById,
    updateInterAccount,
    deleteInterAccount,
    createInterAccount,
    createBulkInterAccount
  };
};
