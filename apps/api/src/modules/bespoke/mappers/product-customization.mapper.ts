import {
  MonogramOption,
  PricingAdjustment,
  ProductCustomization,
  StyleOption,
  StyleOptionGroup,
} from '../../../../generated/prisma/client';
import { ProductCustomizationResponseDto } from '../dto/product-customization-response.dto';
import {
  NestedStyleOptionResponseDto,
  StyleOptionGroupResponseDto,
} from '../dto/style-option-group-response.dto';
import { PricingAdjustmentResponseDto } from '../dto/pricing-adjustment-response.dto';
import { MonogramOptionResponseDto } from '../dto/monogram-option-response.dto';

type StyleOptionGroupWithOptions = StyleOptionGroup & { styleOptions: StyleOption[] };
type ProductCustomizationWithRelations = ProductCustomization & {
  styleOptionGroups: StyleOptionGroupWithOptions[];
  pricingAdjustments: PricingAdjustment[];
  monogramOptions: MonogramOption[];
};

function toNestedStyleOptionResponseDto(option: StyleOption): NestedStyleOptionResponseDto {
  return new NestedStyleOptionResponseDto(
    option.id,
    option.name,
    option.description,
    option.priceAdjustment.toString(),
    option.status,
    option.sortOrder,
  );
}

function toStyleOptionGroupResponseDto(
  group: StyleOptionGroupWithOptions,
): StyleOptionGroupResponseDto {
  return new StyleOptionGroupResponseDto(
    group.id,
    group.name,
    group.description,
    group.isRequired,
    group.sortOrder,
    group.styleOptions.map(toNestedStyleOptionResponseDto),
  );
}

function toPricingAdjustmentResponseDto(
  adjustment: PricingAdjustment,
): PricingAdjustmentResponseDto {
  return new PricingAdjustmentResponseDto(
    adjustment.id,
    adjustment.styleOptionId,
    adjustment.label,
    adjustment.adjustmentType,
    adjustment.amount.toString(),
    adjustment.isActive,
  );
}

function toMonogramOptionResponseDto(monogram: MonogramOption): MonogramOptionResponseDto {
  return new MonogramOptionResponseDto(
    monogram.id,
    monogram.label,
    monogram.maxCharacters,
    monogram.allowedCharacters,
    monogram.priceAdjustment.toString(),
    monogram.isActive,
  );
}

export function toProductCustomizationResponseDto(
  customization: ProductCustomizationWithRelations,
): ProductCustomizationResponseDto {
  return new ProductCustomizationResponseDto(
    customization.id,
    customization.productId,
    customization.name,
    customization.description,
    customization.isActive,
    customization.createdAt,
    customization.updatedAt,
    customization.styleOptionGroups.map(toStyleOptionGroupResponseDto),
    customization.pricingAdjustments.map(toPricingAdjustmentResponseDto),
    customization.monogramOptions.map(toMonogramOptionResponseDto),
  );
}
