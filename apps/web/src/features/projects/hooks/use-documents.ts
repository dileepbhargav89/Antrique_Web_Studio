'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProjectDocuments,
  uploadProjectDocument,
  removeProjectDocument,
} from '../api/documents';
import { documentKeys } from '../api/query-keys';

export function useProjectDocuments(projectId: string) {
  return useQuery({
    queryKey: documentKeys.list(projectId),
    queryFn: ({ signal }) => listProjectDocuments(projectId, signal),
    enabled: Boolean(projectId),
  });
}

export function useUploadProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProjectDocument(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list(projectId) });
      toast.success('File uploaded.');
    },
  });
}

export function useRemoveProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => removeProjectDocument(projectId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list(projectId) });
      toast.success('File removed.');
    },
  });
}
