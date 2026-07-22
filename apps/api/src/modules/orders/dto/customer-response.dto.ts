import { CustomerStatus } from '../../../../generated/prisma/enums';
import { CustomerAddressResponseDto } from './customer-address-response.dto';

export class CustomerResponseDto {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly userId: string | null,
    readonly firstName: string | null,
    readonly lastName: string | null,
    readonly phone: string | null,
    readonly status: CustomerStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly addresses: CustomerAddressResponseDto[],
  ) {}
}
