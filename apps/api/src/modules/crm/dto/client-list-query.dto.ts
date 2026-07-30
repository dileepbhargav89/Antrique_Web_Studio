import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ClientStatus } from '../../../../generated/prisma/enums';
import { CLIENT_SORT_FIELDS } from '../constants/crm.constant';

// Query DTO for GET /clients. `search` matches name/industry — Client has
// no unique slug/code to search on (see client.repository.ts's own
// comment on the lack of a `@@unique` constraint).
export class ClientListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS)
  sortBy?: (typeof CLIENT_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
