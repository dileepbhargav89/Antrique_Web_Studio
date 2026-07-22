import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../../../generated/prisma/enums';

// Request DTO for POST /orders/:id/status. Only the strictly-forward
// DRAFT→PENDING→CONFIRMED→PROCESSING→COMPLETED transitions are valid
// here — CANCELLED is reached only via the separate, more privileged
// `POST /orders/:id/cancel` endpoint (Admin+ only), never through this
// one — see order.service.ts's own `assertValidForwardTransition()`.
export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
