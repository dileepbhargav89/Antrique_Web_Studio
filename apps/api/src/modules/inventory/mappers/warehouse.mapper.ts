import { Warehouse } from '../../../../generated/prisma/client';
import { WarehouseResponseDto } from '../dto/warehouse-response.dto';

export function toWarehouseResponseDto(warehouse: Warehouse): WarehouseResponseDto {
  return new WarehouseResponseDto(
    warehouse.id,
    warehouse.name,
    warehouse.slug,
    warehouse.addressLine1,
    warehouse.city,
    warehouse.region,
    warehouse.postalCode,
    warehouse.country,
    warehouse.status,
    warehouse.createdAt,
    warehouse.updatedAt,
  );
}
