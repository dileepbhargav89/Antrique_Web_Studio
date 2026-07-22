import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MEASUREMENT_PROFILE_SORT_FIELDS } from '../constants/bespoke.constant';

// Query DTO for GET /measurement-profiles. No status/isActive field
// exists on MeasurementProfile (see schema.prisma's own comment) — a
// profile has no archived/active lifecycle — so filtering here is
// deliberately narrower than Fabric/StyleOption's: userId, Search,
// Pagination, Sorting.
export class MeasurementProfileListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(MEASUREMENT_PROFILE_SORT_FIELDS)
  sortBy?: (typeof MEASUREMENT_PROFILE_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
