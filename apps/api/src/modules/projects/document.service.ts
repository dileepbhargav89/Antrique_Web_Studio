import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';
import { DocumentRepository } from './repositories/document.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { DocumentResponseDto } from './dto/document-response.dto';
import { StorageService } from '../../storage';
import { DocumentStatus } from '../../../generated/prisma/enums';
import { Document } from '../../../generated/prisma/client';

export interface UploadDocumentInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

// Upload/list/delete only — see docs/implementation/phase-7-workflow-matrix.md's
// deferred list: preview/version-history/categories/tags/permissions are
// Step 9's (generic Document Management) job, deliberately not built here.
// Mirrors ProductImageService's own "genuinely new sub-resource" shape.
@Injectable()
export class DocumentService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    projectId: string,
    input: UploadDocumentInput,
    tenantId: string,
  ): Promise<DocumentResponseDto> {
    const project = await this.projectRepository.findActiveById(projectId, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const key = `projects/${projectId}/${randomUUID()}-${input.originalName}`;
    await this.storageService.upload({
      key,
      body: input.buffer,
      contentType: input.mimeType,
    });

    const document = await this.documentRepository.create({
      data: {
        tenantId,
        projectId,
        filename: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.length,
        storageKey: key,
        status: DocumentStatus.READY,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId,
      verb: 'document.uploaded',
      summary: `Document "${document.filename}" uploaded`,
    });

    return this.toResponseDto(document);
  }

  async list(projectId: string, tenantId: string): Promise<DocumentResponseDto[]> {
    const project = await this.projectRepository.findActiveById(projectId, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const documents = await this.documentRepository.listByProject(projectId, tenantId);
    return documents.map((document) => this.toResponseDto(document));
  }

  async remove(projectId: string, documentId: string, tenantId: string): Promise<void> {
    const document = await this.documentRepository.findActiveById(documentId, tenantId);
    if (!document || document.projectId !== projectId) {
      throw new NotFoundException(`Document ${documentId} not found on project ${projectId}`);
    }

    // Soft-delete only — the underlying object is left in storage (no
    // StorageService.delete() exists yet; same narrow-upload-only
    // capability the workflow matrix already flags).
    await this.documentRepository.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId,
      verb: 'document.removed',
      summary: `Document "${document.filename}" removed`,
    });
  }

  private toResponseDto(document: Document): DocumentResponseDto {
    return new DocumentResponseDto(
      document.id,
      document.projectId,
      document.filename,
      document.mimeType,
      document.sizeBytes.toString(),
      this.storageService.getPublicUrl(document.storageKey),
      document.status,
      document.createdAt,
    );
  }
}
