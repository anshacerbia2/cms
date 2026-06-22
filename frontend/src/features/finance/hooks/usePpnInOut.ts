import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  }
};

export function usePpnInOut() {
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

  return {
    getPpnInOut,
    getAllPpnInOut,
  };
}
