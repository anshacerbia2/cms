import { PaginatedResponse, PaginationParams } from "@/types/pagination";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserResponse = PaginatedResponse<User>;

export interface CreateUserInput {
  username: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
}

export interface UserQueryParams extends PaginationParams {
  role?: string;
}
