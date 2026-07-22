import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentStatus } from '../../../../generated/prisma/enums';
import { PAYMENT_SORT_FIELDS } from '../constants/billing.constant';

// Covers this milestone's own "Filtering": Payment status, Date range,
// Pagination, Sorting — plus `invoiceId`, this side's own equivalent of
// the shared "Order"/"Customer" filters (a payment is scoped to an
// invoice, not directly to an order/customer).
export class PaymentListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(PAYMENT_SORT_FIELDS)
  sortBy?: (typeof PAYMENT_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
