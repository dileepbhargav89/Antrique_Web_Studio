import { Fabric, FabricImage } from '../../../../generated/prisma/client';
import { FabricResponseDto } from '../dto/fabric-response.dto';
import { FabricImageResponseDto } from '../dto/fabric-image-response.dto';

// Same "one conversion, one place" precedent as catalog/mappers/*.
function toFabricImageResponseDto(image: FabricImage): FabricImageResponseDto {
  return new FabricImageResponseDto(image.id, image.url, image.altText, image.sortOrder);
}

export function toFabricResponseDto(fabric: Fabric, images?: FabricImage[]): FabricResponseDto {
  return new FabricResponseDto(
    fabric.id,
    fabric.name,
    fabric.slug,
    fabric.description,
    fabric.fabricCategoryId,
    fabric.composition,
    fabric.colorHex,
    fabric.priceAdjustment.toString(),
    fabric.status,
    fabric.sortOrder,
    fabric.createdAt,
    fabric.updatedAt,
    images?.map(toFabricImageResponseDto),
  );
}
