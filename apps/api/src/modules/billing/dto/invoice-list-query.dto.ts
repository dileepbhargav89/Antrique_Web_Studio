import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InvoiceStatus } from '../../../../generated/prisma/enums';
import { INVOICE_SORT_FIELDS } from '../constants/billing.constant';

// Covers this milestone's own "Filtering": Status, Customer, Order,
// Date range, Search (invoice number), Pagination, Sorting.
// "Payment status" (the brief's own shared filtering list) applies to
// PaymentListQueryDto instead — Invoice already has its own `status`
// (which includes PAID) covering that need on this side.
export class InvoiceListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy?: (typeof INVOICE_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
