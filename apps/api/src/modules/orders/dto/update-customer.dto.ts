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

// Request DTO for PATCH /customers/:id. `addresses`, when provided,
// FULLY REPLACES the existing set — same "mutable data, not one-time
// structure" reasoning `bespoke/dto/update-measurement-profile.dto.ts`'s
// own `measurements` field established: a customer's saved addresses
// realistically change over time.
export class UpdateCustomerDto {
  @IsOptional()
  @IsEmail()
  email?: string;

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
