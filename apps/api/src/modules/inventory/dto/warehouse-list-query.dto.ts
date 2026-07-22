import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WarehouseStatus } from '../../../../generated/prisma/enums';
import { WAREHOUSE_SORT_FIELDS } from '../constants/inventory.constant';

export class WarehouseListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(WAREHOUSE_SORT_FIELDS)
  sortBy?: (typeof WAREHOUSE_SORT_FIELDS)[number] = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
