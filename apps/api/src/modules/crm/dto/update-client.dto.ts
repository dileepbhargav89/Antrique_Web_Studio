import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ClientStatus } from '../../../../generated/prisma/enums';

// Request DTO for PATCH /clients/:id. `status` IS present here (unlike
// UpdateLeadDto's own status omission) — Client has no dedicated
// archive-style action route (no `clients:delete` permission is seeded),
// so moving ACTIVE -> INACTIVE/ARCHIVED happens through this same
// general-purpose update.
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsEmail()
  primaryEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryPhone?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
