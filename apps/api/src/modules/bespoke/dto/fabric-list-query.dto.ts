import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FabricStatus } from '../../../../generated/prisma/enums';
import { FABRIC_SORT_FIELDS } from '../constants/bespoke.constant';

// Query DTO for GET /fabrics. Covers this milestone's own "Filtering"
// requirement: Product (via the productFabrics join), Fabric category,
// Active status (Fabric's `status` enum plays that role here — see
// schema.prisma's own FabricStatus comment), Search, Pagination, Sorting.
export class FabricListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  fabricCategoryId?: string;

  @IsOptional()
  @IsEnum(FabricStatus)
  status?: FabricStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(FABRIC_SORT_FIELDS)
  sortBy?: (typeof FABRIC_SORT_FIELDS)[number] = 'sortOrder';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
