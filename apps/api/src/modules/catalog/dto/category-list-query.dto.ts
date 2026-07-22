import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CategoryStatus } from '../../../../generated/prisma/enums';
import { CATEGORY_SORT_FIELDS } from '../constants/catalog.constant';

// Query DTO for GET /categories. `sortBy` is validated against a fixed
// allowlist (`@IsIn()`), never passed to Prisma's `orderBy` as raw client
// input — an arbitrary field name there is a request-shape risk, not
// something parameterization alone protects against.
export class CategoryListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(CATEGORY_SORT_FIELDS)
  sortBy?: (typeof CATEGORY_SORT_FIELDS)[number] = 'sortOrder';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
