import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /inventory/:id/reserve. `quantity` must be
// positive (enforced by the database's own CHECK constraint on
// InventoryReservation as the backstop; InventoryService additionally
// pre-checks it won't push `reserved` past `onHand` — "Reservation
// cannot exceed availability," this milestone's own business rule).
export class ReserveStockDto {
  @IsNumberString()
  quantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
