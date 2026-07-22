import { WarehouseStatus } from '../../../../generated/prisma/enums';

export class WarehouseResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly addressLine1: string | null,
    readonly city: string | null,
    readonly region: string | null,
    readonly postalCode: string | null,
    readonly country: string | null,
    readonly status: WarehouseStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
