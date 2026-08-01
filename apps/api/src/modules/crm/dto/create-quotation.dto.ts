import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateQuotationItemDto } from './create-quotation-item.dto';
import { CreatePaymentStageDto } from './create-payment-stage.dto';

// Request DTO for POST /quotations. `leadId`/`clientId` are both
// optional but exactly one must be given — enforced in
// QuotationService (schema.prisma's own comment: "exactly one should be
// set... enforced at the application layer"). `quotationNumber`/
// `subtotalAmount`/`totalAmount`/`status` are all absent — generated/
// computed server-side, never client-supplied (see
// quotation.service.ts). `paymentStages` omitted entirely defaults to
// DEFAULT_PAYMENT_STAGES (40/40/20) — see QuotationService.create().
export class CreateQuotationDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentStageDto)
  paymentStages?: CreatePaymentStageDto[];
}
