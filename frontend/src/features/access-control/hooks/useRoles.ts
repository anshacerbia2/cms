import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { Role, CreateRoleInput, UpdateRoleInput, AccessQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useRoles = (params: AccessQueryParams = {}) => {
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['roles', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Role>>('/roles', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // A role's grants only come back from the detail endpoint, and changing them
  // changes what the signed-in user may see, so the sidebar is refreshed too.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    queryClient.invalidateQueries({ queryKey: ['menus'] });
  };

  const createRoleMutation = useMutation({
    mutationFn: async (newRole: CreateRoleInput) => {
      const { data } = await api.post<Role>('/roles', newRole);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateRoleInput) => {
      const { data } = await api.patch<Role>(`/roles/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/roles/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    rolesQuery,
    createRole: createRoleMutation,
    updateRole: updateRoleMutation,
    deleteRole: deleteRoleMutation,
  };
};

/** One role with its permissions and menus — the editor needs both to prefill. */
export const useRole = (id?: string | null) =>
  useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const { data } = await api.get<Role>(`/roles/${id}`);
      return data;
    },
    enabled: !!id,
  });
