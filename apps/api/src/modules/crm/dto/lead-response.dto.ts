import { LeadStatus } from '../../../../generated/prisma/enums';

export class LeadResponseDto {
  constructor(
    readonly id: string,
    readonly contactName: string,
    readonly contactEmail: string,
    readonly organization: string | null,
    readonly source: string,
    readonly leadSourceId: string | null,
    readonly serviceInterest: string[],
    readonly industry: string | null,
    readonly status: LeadStatus,
    readonly assigneeId: string | null,
    readonly convertedClientId: string | null,
    readonly convertedCustomerId: string | null,
    readonly metadata: unknown,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
