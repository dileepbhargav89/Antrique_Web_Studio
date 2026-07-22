import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CustomerStatus } from '../../../../generated/prisma/enums';
import { CreateCustomerAddressDto } from './create-customer-address.dto';

// Request DTO for POST /customers. `addresses` are created together with
// the customer via Prisma's nested-write `create` — same "implicit
// transaction" reasoning as every other nested-create DTO in this
// codebase. `userId` is optional — validated by CustomerService to
// belong to the caller's tenant, same pattern as bespoke's own
// MeasurementProfile.userId.
export class CreateCustomerDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerAddressDto)
  addresses?: CreateCustomerAddressDto[];
}
