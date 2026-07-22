import { StyleOption, StyleOptionIncompatibility } from '../../../../generated/prisma/client';
import { StyleOptionResponseDto } from '../dto/style-option-response.dto';

// `incompatibilities` rows may name this option as either side of the
// pair (see schema.prisma's own comment on StyleOptionIncompatibility) —
// this maps each row to "the OTHER id", regardless of which side
// `styleOption.id` was stored as.
export function toStyleOptionResponseDto(
  styleOption: StyleOption,
  incompatibilities: StyleOptionIncompatibility[] = [],
): StyleOptionResponseDto {
  const incompatibleStyleOptionIds = incompatibilities.map((row) =>
    row.styleOptionAId === styleOption.id ? row.styleOptionBId : row.styleOptionAId,
  );
  return new StyleOptionResponseDto(
    styleOption.id,
    styleOption.styleOptionGroupId,
    styleOption.name,
    styleOption.description,
    styleOption.priceAdjustment.toString(),
    styleOption.status,
    styleOption.sortOrder,
    styleOption.createdAt,
    styleOption.updatedAt,
    incompatibleStyleOptionIds,
  );
}
