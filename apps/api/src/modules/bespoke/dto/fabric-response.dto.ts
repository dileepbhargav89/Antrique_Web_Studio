import { FabricStatus } from '../../../../generated/prisma/enums';
import { FabricImageResponseDto } from './fabric-image-response.dto';

// `images` optional — same detail-vs-list convention as catalog's own
// ProductResponseDto: GET /fabrics/:id populates it, GET /fabrics omits
// it.
export class FabricResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string | null,
    readonly fabricCategoryId: string | null,
    readonly composition: string | null,
    readonly colorHex: string | null,
    readonly priceAdjustment: string,
    readonly status: FabricStatus,
    readonly sortOrder: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly images?: FabricImageResponseDto[],
  ) {}
}
