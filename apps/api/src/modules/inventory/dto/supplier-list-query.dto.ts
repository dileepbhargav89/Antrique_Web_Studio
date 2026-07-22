import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SupplierStatus } from '../../../../generated/prisma/enums';
import { SUPPLIER_SORT_FIELDS } from '../constants/inventory.constant';

export class SupplierListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SUPPLIER_SORT_FIELDS)
  sortBy?: (typeof SUPPLIER_SORT_FIELDS)[number] = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
