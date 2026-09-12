import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Permission,
  PermissionGroup,
  CreatePermissionInput,
  UpdatePermissionInput,
  AccessQueryParams,
} from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const usePermissions = (params: AccessQueryParams = {}) => {
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ['permissions', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Permission>>('/permissions', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
    queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
  };

  const createPermissionMutation = useMutation({
    mutationFn: async (newPermission: CreatePermissionInput) => {
      const { data } = await api.post<Permission>('/permissions', newPermission);
      return data;
    },
    onSuccess: invalidate,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdatePermissionInput) => {
      const { data } = await api.patch<Permission>(`/permissions/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/permissions/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    permissionsQuery,
    createPermission: createPermissionMutation,
    updatePermission: updatePermissionMutation,
    deletePermission: deletePermissionMutation,
  };
};

/**
 * Every permission at once, grouped by module. The role editor renders them as a
 * checkbox matrix, so paging through them is not an option.
 */
export const usePermissionGroups = () =>
  useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      const { data } = await api.get<PermissionGroup[]>('/permissions/grouped');
      return data;
    },
  });
