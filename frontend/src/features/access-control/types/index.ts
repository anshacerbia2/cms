export interface Permission {
  id: string;
  route: string;
  method?: string | null;
  path?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { roles: number; menus: number };
}

/** Permissions bucketed by the module half of their route, for the role matrix. */
export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface Menu {
  id: string;
  parentId?: string | null;
  name: string;
  icon?: string | null;
  permissionId?: string | null;
  orderIndex: number;
  isVisible: boolean;
  permission?: Permission | null;
  children?: Menu[];
  _count?: { roles: number };
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: { permission: Permission }[];
  menus?: { menu: Menu }[];
  _count?: { users: number; permissions?: number; menus?: number };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roleId?: string | null;
  role?: Role | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  slug: string;
  description?: string;
  /**
   * Absolute, not a delta. Omit to leave the role's grants untouched; send an
   * empty array to revoke everything.
   */
  permissionIds?: number[];
  menuIds?: number[];
}

export interface UpdateRoleInput extends Partial<CreateRoleInput> {
  id: string;
}

export interface CreatePermissionInput {
  route: string;
  method?: string;
  path?: string;
  description?: string;
}

export interface UpdatePermissionInput extends Partial<CreatePermissionInput> {
  id: string;
}

export interface CreateMenuInput {
  name: string;
  parentId?: number | null;
  icon?: string;
  permissionId?: number | null;
  orderIndex?: number;
  isVisible?: boolean;
}

export interface UpdateMenuInput extends Partial<CreateMenuInput> {
  id: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  status?: User['status'];
  roleId?: number;
}

export interface UpdateUserInput extends Partial<Omit<CreateUserInput, 'password'>> {
  id: string;
}

export interface AccessQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}
