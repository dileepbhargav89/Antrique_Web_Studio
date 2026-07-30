'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import {
  useProjectDocuments,
  useUploadProjectDocument,
  useRemoveProjectDocument,
} from '@/features/projects/hooks/use-documents';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';

function formatSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes)) return sizeBytes;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upload/list/delete only — see docs/implementation/phase-7-workflow-matrix.md's deferred
 * list: preview/version-history/categories/tags/permissions are Step 9's job. */
function FilesTab({ projectId }: { projectId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentsQuery = useProjectDocuments(projectId);
  const uploadDocument = useUploadProjectDocument(projectId);
  const removeDocument = useRemoveProjectDocument(projectId);

  if (documentsQuery.error) {
    const { title, description } = getErrorCopy(normalizeError(documentsQuery.error));
    return (
      <ErrorState
        title={title}
        description={description}
        onRetry={() => documentsQuery.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadDocument.mutate(file);
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          disabled={uploadDocument.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          {uploadDocument.isPending ? <Spinner size="sm" /> : null}
          Upload file
        </Button>
      </div>

      {documentsQuery.isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : null}
      {documentsQuery.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(documentsQuery.data ?? []).map((document) => (
          <li
            key={document.id}
            className="flex items-center justify-between gap-4 rounded-md border p-3"
          >
            <div>
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {document.filename}
              </a>
              <p className="text-muted-foreground text-xs">
                {formatSize(document.sizeBytes)} · {formatDate(document.createdAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removeDocument.isPending}
              onClick={() => removeDocument.mutate(document.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { FilesTab };
