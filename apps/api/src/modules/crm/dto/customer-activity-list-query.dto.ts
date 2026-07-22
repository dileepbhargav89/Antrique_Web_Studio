import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CustomerActivityType } from '../../../../generated/prisma/enums';
import { CUSTOMER_ACTIVITY_SORT_FIELDS } from '../constants/crm.constant';

export class CustomerActivityListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  // "LEAD_CREATED" activities have `customerId: null` (no Customer exists
  // yet at that point — see schema.prisma's own comment on
  // CustomerActivity) and so never appear in `timeline()`'s own
  // customer-scoped feed. This is the one way to reach them: filter the
  // general List surface by the originating lead instead.
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsEnum(CustomerActivityType)
  type?: CustomerActivityType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(CUSTOMER_ACTIVITY_SORT_FIELDS)
  sortBy?: (typeof CUSTOMER_ACTIVITY_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
