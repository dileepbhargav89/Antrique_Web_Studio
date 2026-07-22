import { StyleOptionStatus } from '../../../../generated/prisma/enums';

export class StyleOptionResponseDto {
  constructor(
    readonly id: string,
    readonly styleOptionGroupId: string,
    readonly name: string,
    readonly description: string | null,
    readonly priceAdjustment: string,
    readonly status: StyleOptionStatus,
    readonly sortOrder: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly incompatibleStyleOptionIds: string[],
  ) {}
}
