import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CollectionStatus } from '../../../../generated/prisma/enums';
import { COLLECTION_SORT_FIELDS } from '../constants/catalog.constant';

// Same shape as category-list-query.dto.ts.
export class CollectionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(COLLECTION_SORT_FIELDS)
  sortBy?: (typeof COLLECTION_SORT_FIELDS)[number] = 'sortOrder';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
