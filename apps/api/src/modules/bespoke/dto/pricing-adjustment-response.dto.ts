import { PricingAdjustmentType } from '../../../../generated/prisma/enums';

export class PricingAdjustmentResponseDto {
  constructor(
    readonly id: string,
    readonly styleOptionId: string | null,
    readonly label: string,
    readonly adjustmentType: PricingAdjustmentType,
    readonly amount: string,
    readonly isActive: boolean,
  ) {}
}
