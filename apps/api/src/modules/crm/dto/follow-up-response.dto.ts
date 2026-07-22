import { FollowUpStatus } from '../../../../generated/prisma/enums';

export class FollowUpResponseDto {
  constructor(
    readonly id: string,
    readonly leadId: string | null,
    readonly customerId: string | null,
    readonly title: string,
    readonly description: string | null,
    readonly dueAt: Date,
    readonly status: FollowUpStatus,
    readonly assigneeId: string | null,
    readonly completedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
