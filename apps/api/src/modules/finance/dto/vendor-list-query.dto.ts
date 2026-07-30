import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VendorStatus } from '../../../../generated/prisma/enums';
import { VENDOR_SORT_FIELDS } from '../constants/finance.constant';

// Query DTO for GET /vendors. `search` matches name — same shape
// ClientListQueryDto/TaxRateListQueryDto already establish.
export class VendorListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(VENDOR_SORT_FIELDS)
  sortBy?: (typeof VENDOR_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
