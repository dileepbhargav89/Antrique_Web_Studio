import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LeadStatus } from '../../../../generated/prisma/enums';
import { LEAD_SORT_FIELDS } from '../constants/crm.constant';

// Query DTO for GET /leads. Covers this milestone's own "Filtering":
// Status, Assigned user, Source, Date range, Search, Pagination,
// Sorting. "Tags" is deliberately absent here — Lead has no tag
// relationship (CustomerTag is scoped to Customer only, post-conversion —
// see schema.prisma's own comment on CustomerTagAssignment and
// docs/implementation/decisions.md).
export class LeadListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  leadSourceId?: string;

  @IsOptional()
  @IsString()
  source?: string;

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
  @IsIn(LEAD_SORT_FIELDS)
  sortBy?: (typeof LEAD_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
