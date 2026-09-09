import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, CreateUserInput, UpdateUserInput, AccessQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useUsers = (params: AccessQueryParams = {}) => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createUserMutation = useMutation({
    mutationFn: async (newUser: CreateUserInput) => {
      const { data } = await api.post<User>('/users', newUser);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateUserInput) => {
      const { data } = await api.patch<User>(`/users/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  // Separate from update on purpose: the update endpoint rejects a password
  // field outright, so an edit can never reset someone's credentials by accident.
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { data } = await api.patch(`/users/${id}/password`, { password });
      return data;
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    usersQuery,
    createUser: createUserMutation,
    updateUser: updateUserMutation,
    changePassword: changePasswordMutation,
    deleteUser: deleteUserMutation,
  };
};
