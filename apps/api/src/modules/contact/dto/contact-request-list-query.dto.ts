import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContactRequestStatus } from '../../../../generated/prisma/enums';

// Query DTO for GET /contact-requests — same shape as lead-list-query.dto.ts's
// own status/search/pagination filters, scoped to what an inbox/triage view
// actually needs (no assignee/date-range yet — ContactRequest has neither
// field, unlike Lead).
export class ContactRequestListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactRequestStatus)
  status?: ContactRequestStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
