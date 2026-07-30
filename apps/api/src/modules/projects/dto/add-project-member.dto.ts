import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProjectMemberRole } from '../../../../generated/prisma/enums';

export class AddProjectMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole;
}
