import { ProjectStatus } from '../../../../generated/prisma/enums';

export class ProjectResponseDto {
  constructor(
    readonly id: string,
    readonly clientId: string,
    readonly leadId: string | null,
    readonly name: string,
    readonly summary: string | null,
    readonly status: ProjectStatus,
    readonly startDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
