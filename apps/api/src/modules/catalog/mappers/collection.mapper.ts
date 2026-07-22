import { Collection } from '../../../../generated/prisma/client';
import { CollectionResponseDto } from '../dto/collection-response.dto';

// Same shape as category.mapper.ts.
export function toCollectionResponseDto(collection: Collection): CollectionResponseDto {
  return new CollectionResponseDto(
    collection.id,
    collection.name,
    collection.slug,
    collection.description,
    collection.status,
    collection.sortOrder,
    collection.createdAt,
    collection.updatedAt,
  );
}
