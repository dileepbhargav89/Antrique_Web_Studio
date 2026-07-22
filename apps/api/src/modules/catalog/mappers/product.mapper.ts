import { Product, ProductVariant, ProductImage } from '../../../../generated/prisma/client';
import { ProductResponseDto } from '../dto/product-response.dto';
import { ProductVariantResponseDto } from '../dto/product-variant-response.dto';
import { ProductImageResponseDto } from '../dto/product-image-response.dto';

// Same "one conversion, one place" precedent as category.mapper.ts/
// collection.mapper.ts. `price.toString()`: Prisma's `Decimal` (from
// decimal.js) already serializes to a JSON string via its own `toJSON()`
// — converting explicitly here just makes ProductVariantResponseDto's
// own `price: string` field type honestly match what actually gets sent,
// rather than leaving a Decimal instance's TS type implicit.
function toProductVariantResponseDto(variant: ProductVariant): ProductVariantResponseDto {
  return new ProductVariantResponseDto(
    variant.id,
    variant.sku,
    variant.name,
    variant.attributes,
    variant.price.toString(),
    variant.isActive,
    variant.sortOrder,
  );
}

function toProductImageResponseDto(image: ProductImage): ProductImageResponseDto {
  return new ProductImageResponseDto(image.id, image.url, image.altText, image.sortOrder);
}

// `variants`/`images` are separate, optional parameters — not read off
// `product` directly — so this same function serves both the list view
// (called with neither) and the detail view (called with both, from
// ProductRepository.findActiveById()'s `include`) without needing two
// separate mapper functions.
export function toProductResponseDto(
  product: Product,
  variants?: ProductVariant[],
  images?: ProductImage[],
): ProductResponseDto {
  return new ProductResponseDto(
    product.id,
    product.name,
    product.slug,
    product.description,
    product.categoryId,
    product.collectionId,
    product.status,
    product.sortOrder,
    product.metadata,
    product.createdAt,
    product.updatedAt,
    variants?.map(toProductVariantResponseDto),
    images?.map(toProductImageResponseDto),
  );
}
