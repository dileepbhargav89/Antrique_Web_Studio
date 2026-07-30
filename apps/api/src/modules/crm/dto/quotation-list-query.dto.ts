import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { QuotationStatus } from '../../../../generated/prisma/enums';
import { QUOTATION_SORT_FIELDS } from '../constants/crm.constant';

export class QuotationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(QUOTATION_SORT_FIELDS)
  sortBy?: (typeof QUOTATION_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
