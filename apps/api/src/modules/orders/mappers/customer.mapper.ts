import { Customer, CustomerAddress } from '../../../../generated/prisma/client';
import { CustomerResponseDto } from '../dto/customer-response.dto';
import { CustomerAddressResponseDto } from '../dto/customer-address-response.dto';

function toCustomerAddressResponseDto(address: CustomerAddress): CustomerAddressResponseDto {
  return new CustomerAddressResponseDto(
    address.id,
    address.label,
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
    address.phone,
    address.isDefaultShipping,
    address.isDefaultBilling,
  );
}

export function toCustomerResponseDto(
  customer: Customer,
  addresses: CustomerAddress[] = [],
): CustomerResponseDto {
  return new CustomerResponseDto(
    customer.id,
    customer.email,
    customer.userId,
    customer.firstName,
    customer.lastName,
    customer.phone,
    customer.status,
    customer.createdAt,
    customer.updatedAt,
    addresses.map(toCustomerAddressResponseDto),
  );
}
