import { StyleOptionGroupResponseDto } from './style-option-group-response.dto';
import { PricingAdjustmentResponseDto } from './pricing-adjustment-response.dto';
import { MonogramOptionResponseDto } from './monogram-option-response.dto';

// `styleOptionGroups`/`pricingAdjustments`/`monogramOptions` are always
// populated (unlike catalog's own detail-vs-list split) — a
// ProductCustomization list row without its configuration would be a
// nearly useless summary, and this milestone's own "List" endpoint has no
// separate lightweight use case the way a product catalog's list does.
export class ProductCustomizationResponseDto {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly name: string | null,
    readonly description: string | null,
    readonly isActive: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly styleOptionGroups: StyleOptionGroupResponseDto[],
    readonly pricingAdjustments: PricingAdjustmentResponseDto[],
    readonly monogramOptions: MonogramOptionResponseDto[],
  ) {}
}
