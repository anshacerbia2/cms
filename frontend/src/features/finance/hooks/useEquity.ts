import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equityService } from "../services/equity.service";

export function useEquity(year: number) {
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({
    queryKey: ["finance", "equity-properties", year],
    queryFn: () => equityService.getProperties(year),
    enabled: !!year,
  });

  const updatePropertiesMutation = useMutation({
    mutationFn: (properties: Record<string, string>) => equityService.setProperties(year, properties),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "equity-properties"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "balance-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "pl-statement"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "pl-summary"] });
    },
  });

  return {
    properties: propertiesQuery.data,
    isLoading: propertiesQuery.isLoading,
    updateProperties: updatePropertiesMutation.mutateAsync,
    isUpdating: updatePropertiesMutation.isPending,
  };
}
