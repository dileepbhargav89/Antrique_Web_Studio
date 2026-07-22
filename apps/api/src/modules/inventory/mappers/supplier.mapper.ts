import { Supplier, SupplierProduct } from '../../../../generated/prisma/client';
import { SupplierResponseDto } from '../dto/supplier-response.dto';
import { SupplierProductResponseDto } from '../dto/supplier-product-response.dto';

function toSupplierProductResponseDto(product: SupplierProduct): SupplierProductResponseDto {
  return new SupplierProductResponseDto(
    product.id,
    product.productVariantId,
    product.fabricId,
    product.supplierSku,
    product.cost?.toString() ?? null,
    product.leadTimeDays,
  );
}

export function toSupplierResponseDto(
  supplier: Supplier,
  products: SupplierProduct[] = [],
): SupplierResponseDto {
  return new SupplierResponseDto(
    supplier.id,
    supplier.name,
    supplier.slug,
    supplier.contactName,
    supplier.contactEmail,
    supplier.contactPhone,
    supplier.status,
    supplier.notes,
    supplier.createdAt,
    supplier.updatedAt,
    products.map(toSupplierProductResponseDto),
  );
}
