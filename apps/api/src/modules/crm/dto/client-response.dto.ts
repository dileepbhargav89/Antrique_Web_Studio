import { ClientStatus } from '../../../../generated/prisma/enums';

export class ClientResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly industry: string | null,
    readonly website: string | null,
    readonly primaryEmail: string | null,
    readonly primaryPhone: string | null,
    readonly status: ClientStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
