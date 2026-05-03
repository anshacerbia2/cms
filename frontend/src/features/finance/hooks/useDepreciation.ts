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

  const getAllAssets = (options?: any) =>
    useQuery<any[]>({
      queryKey: ["finance", "assets", "all"],
      queryFn: () => depreciationService.getAllAssets(),
      ...options,
    });

  const createBulkAssets = useMutation({
    mutationFn: (data: any[]) => depreciationService.createBulkAssets(data),
  });

  return {
    getAssets,
    getAllAssets,
    createBulkAssets,
  };
}
