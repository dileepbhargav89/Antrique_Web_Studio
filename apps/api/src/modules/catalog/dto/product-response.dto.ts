import { ProductStatus } from '../../../../generated/prisma/enums';
import { ProductVariantResponseDto } from './product-variant-response.dto';
import { ProductImageResponseDto } from './product-image-response.dto';

// `variants`/`images` are optional — a common REST convention this
// milestone adopts deliberately: GET /products/:id (detail) populates
// both; GET /products (list) omits them (a lighter summary view,
// avoiding an N+1-shaped over-fetch on every list row). See
// product.service.ts's `findById()` vs `list()`.
export class ProductResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string | null,
    readonly categoryId: string | null,
    readonly collectionId: string | null,
    readonly status: ProductStatus,
    readonly sortOrder: number,
    readonly metadata: unknown,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly variants?: ProductVariantResponseDto[],
    readonly images?: ProductImageResponseDto[],
  ) {}
}
