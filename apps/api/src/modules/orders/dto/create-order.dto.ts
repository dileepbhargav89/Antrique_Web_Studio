import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

// Request DTO for POST /orders. `items` are created together with the
// order via Prisma's nested-write `create`, but only AFTER
// OrderService has reserved inventory for each one and computed its
// pricing — see order.service.ts's own comment on why this can't be a
// single nested-write the way catalog's own CreateProductDto is.
export class CreateOrderDto {
  @IsUUID()
  customerId!: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
