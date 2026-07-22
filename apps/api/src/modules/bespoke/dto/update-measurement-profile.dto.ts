import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateMeasurementDto } from './create-measurement.dto';

// Request DTO for PATCH /measurement-profiles/:id. Unlike catalog's own
// UpdateProductDto (which deliberately excludes variants/images —
// immutable after create), `measurements` IS accepted here: a person's
// body measurements genuinely change over time, and re-measuring is a
// real, expected update — not a one-time structural setup like a
// product's variant list. When provided, this FULL-REPLACES the
// profile's measurements (see measurement.repository.ts's
// replaceMeasurements()); omit the field to leave existing measurements
// untouched.
export class UpdateMeasurementProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMeasurementDto)
  measurements?: CreateMeasurementDto[];
}
