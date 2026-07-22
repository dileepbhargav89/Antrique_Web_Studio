import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /inventory/:id/adjust. `delta` may be positive
// (found extra stock) or negative (damage, loss, correction) — unlike
// `ReceiveStockDto.quantity`, which is always a positive addition.
// InventoryService pre-checks the resulting onHand won't go negative
// ("Prevent negative stock," this milestone's own business rule) before
// writing, with the database's own CHECK constraint as the race-free
// backstop.
export class AdjustStockDto {
  @IsNumberString()
  delta!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
