import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MeasurementUnit } from '../../../../generated/prisma/enums';

// Nested DTO — only ever validated as part of
// CreateMeasurementProfileDto.measurements/UpdateMeasurementProfileDto.measurements
// (see those files' `@ValidateNested({ each: true })`), never its own
// request body: no standalone Measurement controller exists this
// milestone (see measurement.repository.ts's own header comment).
export class CreateMeasurementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  // Numeric string, same convention as money fields — avoids
  // float-precision loss for a 2-decimal measurement value.
  @IsNumberString()
  value!: string;

  @IsEnum(MeasurementUnit)
  unit!: MeasurementUnit;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
