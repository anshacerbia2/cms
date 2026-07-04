import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaginationParams, PaginatedResponse } from "./useFinance";
import api from "@/lib/api";

export const ppnInOutService = {
  getPpnInOut: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/finance/ppn-in-out', { params });
    return response.data;
  },
  getAllPpnInOut: async (year?: number): Promise<any[]> => {
    const response = await api.get('/finance/ppn-in-out/all', { params: { year } });
    return response.data;
  },
  getPpnInOutById: async (id: number): Promise<any> => {
    const { data } = await api.get(`/finance/ppn-in-out/${id}`);
    return data;
  },
  updatePpnInOut: async (id: number, payload: any): Promise<any> => {
    const { data } = await api.patch(`/finance/ppn-in-out/${id}`, payload);
    return data;
  },
  deletePpnInOut: async (id: number): Promise<any> => {
    const { data } = await api.delete(`/finance/ppn-in-out/${id}`);
    return data;
  }
};

export function usePpnInOut() {
  const queryClient = useQueryClient();
  const getPpnInOut = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "ppn-in-out", params],
      queryFn: () => ppnInOutService.getPpnInOut(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllPpnInOut = (year?: number, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "ppn-in-out", "all", year],
      queryFn: () => ppnInOutService.getAllPpnInOut(year),
      ...options,
    });

  const getPpnInOutById = (id: number | null, options?: any) => 
    useQuery<any>({
      queryKey: ["finance", "ppn-in-out", id],
      queryFn: () => ppnInOutService.getPpnInOutById(id!),
      enabled: !!id,
      ...options,
    });

  const updatePpnInOut = () => 
    useMutation({
      mutationFn: ({ id, data }: { id: number, data: any }) => ppnInOutService.updatePpnInOut(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "ppn-in-out"] });
      }
    });

  const deletePpnInOut = () => 
    useMutation({
      mutationFn: (id: number) => ppnInOutService.deletePpnInOut(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "ppn-in-out"] });
        toast.success("PPN In/Out record deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete record");
      }
    });

  return {
    getPpnInOut,
    getAllPpnInOut,
    getPpnInOutById,
    updatePpnInOut,
    deletePpnInOut,
  };
}
