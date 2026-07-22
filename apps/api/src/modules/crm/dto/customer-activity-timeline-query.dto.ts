import { IsUUID } from 'class-validator';

// Query DTO for GET /customer-activities/timeline — the full,
// unpaginated, ascending feed for exactly one customer ("Timeline
// creation," this milestone's own explicit business responsibility).
// Deliberately NOT extending PaginationQueryDto: `list()` is the
// paginated/filterable general surface; `timeline()` is "everything for
// this one customer, in order," a genuinely different read shape.
export class CustomerActivityTimelineQueryDto {
  @IsUUID()
  customerId!: string;
}
