import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { INVENTORY_ITEM_SORT_FIELDS } from '../constants/inventory.constant';

// Query DTO for GET /inventory. Covers this milestone's own "Filtering":
// Warehouse, Product (productVariantId), Fabric (fabricId), Supplier (a
// relation filter through SupplierProduct — an item's variant/fabric
// must have a supplier link), Search (a relation filter into the
// variant's sku / fabric's name), Pagination, Sorting.
export class InventoryItemListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(INVENTORY_ITEM_SORT_FIELDS)
  sortBy?: (typeof INVENTORY_ITEM_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
