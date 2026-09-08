import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { Project, CreateProjectInput, UpdateProjectInput, ProjectQueryParams } from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const useProjects = (params: ProjectQueryParams = {}) => {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Project>>('/projects', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects'] });

  const createProjectMutation = useMutation({
    mutationFn: async (newProject: CreateProjectInput) => {
      const { data } = await api.post<Project>('/projects', newProject);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateProjectInput) => {
      const { data } = await api.patch<Project>(`/projects/${id}`, updateData);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/projects/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    projectsQuery,
    createProject: createProjectMutation,
    updateProject: updateProjectMutation,
    deleteProject: deleteProjectMutation,
  };
};

/** Lightweight lookup for the pickers on proposal and invoice forms. */
export const useProjectOptions = (params: ProjectQueryParams = {}) =>
  useQuery({
    queryKey: ['projects', 'options', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Project>>('/projects', {
        params: { limit: 100, ...params },
      });
      return data.data;
    },
  });
