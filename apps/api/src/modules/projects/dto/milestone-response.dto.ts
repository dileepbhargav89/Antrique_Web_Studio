import { MilestoneStatus } from '../../../../generated/prisma/enums';

export class MilestoneResponseDto {
  constructor(
    readonly id: string,
    readonly projectId: string,
    readonly title: string,
    readonly description: string | null,
    readonly status: MilestoneStatus,
    readonly dueDate: Date | null,
    readonly completedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
