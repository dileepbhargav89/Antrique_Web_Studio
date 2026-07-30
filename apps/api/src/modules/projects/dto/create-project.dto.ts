import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Request DTO for POST /projects. `status` is intentionally absent — every
// Project starts DRAFT (schema default); moving forward happens only
// through PATCH /projects/:id (see UpdateProjectDto), same "status omitted
// on create" convention as CreateClientDto.
export class CreateProjectDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
