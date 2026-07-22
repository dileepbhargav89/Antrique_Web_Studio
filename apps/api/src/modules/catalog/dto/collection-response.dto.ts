import { CollectionStatus } from '../../../../generated/prisma/enums';

// Same shape as category-response.dto.ts.
export class CollectionResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string | null,
    readonly status: CollectionStatus,
    readonly sortOrder: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
