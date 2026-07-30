import { ContentDraft } from '../../../../generated/prisma/client';
import { ContentDraftResponseDto } from '../dto/content-draft-response.dto';

export function toContentDraftResponseDto(draft: ContentDraft): ContentDraftResponseDto {
  return new ContentDraftResponseDto(
    draft.id,
    draft.type,
    draft.title,
    draft.body,
    draft.brief,
    draft.version,
    draft.createdAt,
    draft.updatedAt,
  );
}
