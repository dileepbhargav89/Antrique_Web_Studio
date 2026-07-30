import { ProjectMemberRole } from '../../../../generated/prisma/enums';

export class ProjectMemberResponseDto {
  constructor(
    readonly userId: string,
    readonly role: ProjectMemberRole,
    readonly addedAt: Date,
  ) {}
}
