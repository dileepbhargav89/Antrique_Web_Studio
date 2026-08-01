import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateQuotationItemDto } from './create-quotation-item.dto';
import { CreatePaymentStageDto } from './create-payment-stage.dto';

// Request DTO for PATCH /quotations/:id — only reachable while DRAFT
// (QuotationService.assertEditable()). No leadId/clientId — the
// quotation's own subject doesn't change after creation; a wrong
// lead/client means starting a new quotation, not editing this one. When
// `items` is given, it REPLACES the full set (delete + recreate in one
// transaction) — simpler and safer than per-item add/remove/reorder
// endpoints for a document that's still a draft.
export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];

  // Same replace-the-full-set semantics as `items` above — omitted means
  // "leave the existing schedule alone," given means "replace it
  // entirely" (delete + recreate in the same transaction).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentStageDto)
  paymentStages?: CreatePaymentStageDto[];
}
