import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InventoryTransactionType } from '../../../../generated/prisma/enums';
import { INVENTORY_TRANSACTION_SORT_FIELDS } from '../constants/inventory.constant';

// Query DTO for GET /inventory/transactions. Covers this milestone's own
// "Filtering": inventory item, Warehouse (a relation filter through
// InventoryItem), Transaction type, Date range, Pagination, Sorting.
// No free-text "Search" here — a transaction ledger row has no
// name/description field to search against, unlike the item list.
export class InventoryTransactionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(INVENTORY_TRANSACTION_SORT_FIELDS)
  sortBy?: (typeof INVENTORY_TRANSACTION_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
