import { SupplierStatus } from '../../../../generated/prisma/enums';
import { SupplierProductResponseDto } from './supplier-product-response.dto';

export class SupplierResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly contactName: string | null,
    readonly contactEmail: string | null,
    readonly contactPhone: string | null,
    readonly status: SupplierStatus,
    readonly notes: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly products: SupplierProductResponseDto[],
  ) {}
}
