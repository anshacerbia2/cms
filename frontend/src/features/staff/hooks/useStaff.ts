import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import { 
  User, 
  UserResponse, 
  UserQueryParams, 
  CreateUserInput, 
  UpdateUserInput 
} from "../types";

const StaffService = {
  findAll: async (params: UserQueryParams): Promise<UserResponse> => {
    const response = await api.get("/users", { params });
    return response.data;
  },

  findOne: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserInput): Promise<User> => {
    const response = await api.post("/users", data);
    return response.data;
  },

  update: async ({ id, ...data }: UpdateUserInput): Promise<User> => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export function useStaff(params: UserQueryParams = {}) {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["users", params],
    queryFn: () => StaffService.findAll(params),
  });

  const createUser = useMutation({
    mutationFn: StaffService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateUser = useMutation({
    mutationFn: StaffService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: StaffService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    usersQuery,
    createUser,
    updateUser,
    deleteUser,
  };
}
