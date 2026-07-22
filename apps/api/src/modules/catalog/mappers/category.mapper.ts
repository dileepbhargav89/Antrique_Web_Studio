import { Category } from '../../../../generated/prisma/client';
import { CategoryResponseDto } from '../dto/category-response.dto';

// The one place a Category row becomes a CategoryResponseDto — mirrors
// modules/auth/mappers/auth-token-payload.mapper.ts's "one conversion,
// one place" precedent.
export function toCategoryResponseDto(category: Category): CategoryResponseDto {
  return new CategoryResponseDto(
    category.id,
    category.name,
    category.slug,
    category.description,
    category.status,
    category.sortOrder,
    category.createdAt,
    category.updatedAt,
  );
}
