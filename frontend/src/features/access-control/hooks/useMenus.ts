import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Menu, CreateMenuInput, UpdateMenuInput } from '../types';

export const useMenus = () => {
  const queryClient = useQueryClient();

  // Returns the whole tree, not a page: nesting can only be rendered with every
  // node present, and the editor's parent picker needs the full list anyway.
  const menusQuery = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const { data } = await api.get<Menu[]>('/menus');
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['menus'] });

  const createMenuMutation = useMutation({
    mutationFn: async (newMenu: CreateMenuInput) => {
      const { data } = await api.post<Menu>('/menus', newMenu);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateMenuMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateMenuInput) => {
      const { data } = await api.patch<Menu>(`/menus/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/menus/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    menusQuery,
    createMenu: createMenuMutation,
    updateMenu: updateMenuMutation,
    deleteMenu: deleteMenuMutation,
  };
};

/** Flattens the tree into "Parent › Child" labels for pickers and tables. */
export const flattenMenus = (menus: Menu[], prefix = ''): { menu: Menu; label: string }[] =>
  menus.flatMap((menu) => {
    const label = prefix ? `${prefix} › ${menu.name}` : menu.name;
    return [{ menu, label }, ...flattenMenus(menu.children ?? [], label)];
  });
