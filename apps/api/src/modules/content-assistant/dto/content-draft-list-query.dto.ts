import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContentDraftType } from '../../../../generated/prisma/enums';
import { CONTENT_DRAFT_SORT_FIELDS } from '../constants/content-assistant.constant';

export class ContentDraftListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContentDraftType)
  type?: ContentDraftType;

  @IsOptional()
  @IsIn(CONTENT_DRAFT_SORT_FIELDS)
  sortBy?: (typeof CONTENT_DRAFT_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
