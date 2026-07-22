import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { StyleOptionStatus } from '../../../../generated/prisma/enums';
import { STYLE_OPTION_SORT_FIELDS } from '../constants/bespoke.constant';

// Query DTO for GET /style-options. Covers this milestone's own
// "Filtering": Product (via styleOptionGroup.productCustomization.productId
// — a relation filter, not a plain scalar), styleOptionGroupId (a natural
// FK filter, same spirit as catalog's own categoryId/collectionId
// filters), Active status (StyleOption's `status` enum), Search,
// Pagination, Sorting.
export class StyleOptionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  styleOptionGroupId?: string;

  @IsOptional()
  @IsEnum(StyleOptionStatus)
  status?: StyleOptionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(STYLE_OPTION_SORT_FIELDS)
  sortBy?: (typeof STYLE_OPTION_SORT_FIELDS)[number] = 'sortOrder';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
