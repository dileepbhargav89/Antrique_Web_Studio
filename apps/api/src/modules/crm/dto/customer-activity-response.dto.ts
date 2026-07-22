import { CustomerActivityType } from '../../../../generated/prisma/enums';

export class CustomerActivityResponseDto {
  constructor(
    readonly id: string,
    readonly customerId: string | null,
    readonly type: CustomerActivityType,
    readonly summary: string,
    readonly actorUserId: string | null,
    readonly relatedLeadId: string | null,
    readonly metadata: unknown,
    readonly createdAt: Date,
  ) {}
}
