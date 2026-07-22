import { TaxRate } from '../../../../generated/prisma/client';
import { TaxRateResponseDto } from '../dto/tax-rate-response.dto';

export function toTaxRateResponseDto(taxRate: TaxRate): TaxRateResponseDto {
  return new TaxRateResponseDto(
    taxRate.id,
    taxRate.name,
    taxRate.rate.toString(),
    taxRate.isActive,
    taxRate.createdAt,
    taxRate.updatedAt,
  );
}
