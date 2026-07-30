import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PROJECT_UPDATABLE_STATUSES } from '../constants/projects.constant';

// Request DTO for PATCH /projects/:id. `status` accepts only the
// non-terminal statuses — ARCHIVED is reached exclusively through the
// dedicated `POST /projects/:id/archive` action (see project.controller.ts).
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsIn(PROJECT_UPDATABLE_STATUSES)
  status?: (typeof PROJECT_UPDATABLE_STATUSES)[number];
}
