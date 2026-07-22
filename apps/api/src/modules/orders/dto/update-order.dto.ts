import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Request DTO for PATCH /orders/:id — top-level, non-structural fields
// only. No `items` (immutable after create, same discipline catalog's
// own UpdateProductDto gives ProductVariant/ProductImage) and no
// `status` (status changes go through the dedicated "Change status"/
// "Cancel" endpoints, each with their own RBAC tier and transition
// rules — see order.service.ts's own comment).
export class UpdateOrderDto {
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @IsOptional()
  @IsUUID()
  billingAddressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
