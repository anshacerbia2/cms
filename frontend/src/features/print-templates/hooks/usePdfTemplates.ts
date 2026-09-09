import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PdfTemplate,
  CreatePdfTemplateInput,
  UpdatePdfTemplateInput,
  PdfTemplateQueryParams,
  PreviewResult,
} from '../types';
import { PaginatedResponse } from '@/types/pagination';

export const usePdfTemplates = (params: PdfTemplateQueryParams = {}) => {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['pdf-templates', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PdfTemplate>>('/pdf-templates', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Saving one template can flip another's active flag, so the whole list is refetched.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });

  const createTemplateMutation = useMutation({
    mutationFn: async (input: CreatePdfTemplateInput) => {
      const { data } = await api.post<PdfTemplate>('/pdf-templates', input);
      return data;
    },
    onSuccess: invalidate,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePdfTemplateInput) => {
      const { data } = await api.patch<PdfTemplate>(`/pdf-templates/${id}`, input);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/pdf-templates/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });

  const previewMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      const { data } = await api.post<PreviewResult>('/pdf-templates/preview', { htmlContent });
      return data;
    },
  });

  return {
    templatesQuery,
    createTemplate: createTemplateMutation,
    updateTemplate: updateTemplateMutation,
    deleteTemplate: deleteTemplateMutation,
    preview: previewMutation,
  };
};

/** One template including its markup, which the list response leaves out. */
export const usePdfTemplate = (id?: string | null) =>
  useQuery({
    queryKey: ['pdf-templates', id],
    queryFn: async () => {
      const { data } = await api.get<PdfTemplate>(`/pdf-templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
