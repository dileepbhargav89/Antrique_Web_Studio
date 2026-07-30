import { DocumentStatus } from '../../../../generated/prisma/enums';

export class DocumentResponseDto {
  constructor(
    readonly id: string,
    readonly projectId: string,
    readonly filename: string,
    readonly mimeType: string,
    readonly sizeBytes: string,
    readonly url: string,
    readonly status: DocumentStatus,
    readonly createdAt: Date,
  ) {}
}
