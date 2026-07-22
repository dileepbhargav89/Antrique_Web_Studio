import { CustomerTag } from '../../../../generated/prisma/client';
import { CustomerTagResponseDto } from '../dto/customer-tag-response.dto';

export function toCustomerTagResponseDto(tag: CustomerTag): CustomerTagResponseDto {
  return new CustomerTagResponseDto(
    tag.id,
    tag.name,
    tag.slug,
    tag.color,
    tag.createdAt,
    tag.updatedAt,
  );
}
