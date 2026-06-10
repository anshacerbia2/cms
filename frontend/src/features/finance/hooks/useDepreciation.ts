import { useQuery, keepPreviousData, useMutation } from "@tanstack/react-query";
import { depreciationService } from "../services/depreciation.service";
import { PaginationParams, PaginatedResponse } from "./useFinance";

export function useDepreciation() {
  const getAssets = (params: PaginationParams, options?: any) =>
    useQuery<PaginatedResponse<any>>({
      queryKey: ["finance", "assets", params],
      queryFn: () => depreciationService.getAssets(params),
      placeholderData: keepPreviousData,
      ...options,
    });

  const getAllAssets = (year?: number, options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "assets", "all", year],
      queryFn: () => depreciationService.getAllAssets(year),
      ...options,
    });

  const createBulkAssets = useMutation({
    mutationFn: (payload: { data: any[], tagYear: number }) => depreciationService.createBulkAssets(payload),
  });

  return {
    getAssets,
    getAllAssets,
    createBulkAssets,
  };
}
