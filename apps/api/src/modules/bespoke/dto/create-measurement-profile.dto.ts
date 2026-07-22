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

// Request DTO for POST /measurement-profiles. `measurements` are created
// together with the profile via Prisma's nested-write `create` (see
// measurement.repository.ts) — same "implicit transaction" reasoning as
// catalog's own create-product.dto.ts. `userId` is optional — not
// explicitly asked for by this milestone's "Relationships" list, but a
// measurement profile needs SOME owner to be a meaningful, listable
// resource (see schema.prisma's own comment on MeasurementProfile);
// MeasurementService validates it belongs to the caller's tenant.
export class CreateMeasurementProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

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
