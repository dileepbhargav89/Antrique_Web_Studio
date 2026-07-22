import { CategoryStatus } from '../../../../generated/prisma/enums';

// Response DTO for every Category endpoint. A plain shape, not the Prisma
// row directly — never returning a Prisma model straight from a
// controller keeps the API response contract independent of the
// database's own column set (e.g. tenantId/deletedAt/deletedBy/version
// stay internal, never serialized to a client).
export class CategoryResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string | null,
    readonly status: CategoryStatus,
    readonly sortOrder: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
