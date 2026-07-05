import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { depreciationService } from "../services/depreciation.service";
import { PaginationParams, PaginatedResponse } from "./useFinance";

export function useDepreciation() {
  const queryClient = useQueryClient();
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

  const getAssetById = (id: number | null, options?: any) => 
    useQuery<any>({
      queryKey: ["finance", "assets", id],
      queryFn: () => depreciationService.getAssetById(id!),
      enabled: !!id,
      ...options,
    });

  const updateAsset = useMutation({
      mutationFn: ({ id, data }: { id: number, data: any }) => depreciationService.updateAsset(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "assets"] });
      }
    });

  const deleteAsset = useMutation({
      mutationFn: (id: number) => depreciationService.deleteAsset(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["finance", "assets"] });
        toast.success("Depreciation record deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete depreciation record");
      }
    });

  return {
    getAssets,
    getAllAssets,
    createBulkAssets,
    getAssetById,
    updateAsset,
    deleteAsset,
  };
}
