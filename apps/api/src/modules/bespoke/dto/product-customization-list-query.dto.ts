import { IsBooleanString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PRODUCT_CUSTOMIZATION_SORT_FIELDS } from '../constants/bespoke.constant';

// Query DTO for GET /product-customizations. Covers this milestone's own
// "Filtering": Product, Active status (ProductCustomization's `isActive`
// boolean), Search, Pagination, Sorting. `isActive` arrives as a query
// string ("true"/"false") — `@IsBooleanString()`, then parsed in the
// service, same convention pagination-query.dto.ts's own `@Type(() =>
// Number)` establishes for query-string coercion.
export class ProductCustomizationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(PRODUCT_CUSTOMIZATION_SORT_FIELDS)
  sortBy?: (typeof PRODUCT_CUSTOMIZATION_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
