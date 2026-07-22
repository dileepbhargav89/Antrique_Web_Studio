import { IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Nested DTO — only ever validated as part of
// CreateSupplierDto.products/UpdateSupplierDto.products (a full replace
// at update — see that file's own comment), never its own request body:
// no standalone SupplierProduct controller exists this milestone (see
// supplier.repository.ts's own header comment). Exactly one of
// `productVariantId`/`fabricId` must be given — validated by
// SupplierService (the same XOR the database's own CHECK constraint
// enforces as the backstop).
export class CreateSupplierProductDto {
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsOptional()
  @IsString()
  supplierSku?: string;

  @IsOptional()
  @IsNumberString()
  cost?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;
}
