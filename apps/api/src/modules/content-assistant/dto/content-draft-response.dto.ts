import { ContentDraftType } from '../../../../generated/prisma/enums';

export class ContentDraftResponseDto {
  constructor(
    readonly id: string,
    readonly type: ContentDraftType,
    readonly title: string,
    readonly body: string,
    readonly brief: string,
    readonly version: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
