import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Request DTO for POST /clients. `status` is intentionally absent —
// every Client starts ACTIVE (schema default); moving to
// INACTIVE/ARCHIVED happens only through PATCH /clients/:id (there is no
// dedicated archive endpoint — no `clients:delete` permission is seeded,
// so status change via the ordinary update route is the only mutation
// path, unlike Lead's dedicated `:id/archive` action).
export class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

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
}
