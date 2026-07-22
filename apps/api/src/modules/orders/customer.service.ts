import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerRepository } from './repositories/customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { toCustomerResponseDto } from './mappers/customer.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CustomerStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// This milestone's own "Customer" business responsibilities live here:
// - "Duplicate email handling" — the database's own partial unique index
//   (`customers_tenant_id_email_key`) is the real backstop; a P2002 here
//   is translated to a clean `409 ConflictException`, the same
//   established pattern every prior module's slug/sku uniqueness uses.
// - "Default addresses" — `assertAtMostOneDefaultPerType()` rejects a
//   request naming more than one `isDefaultShipping`/`isDefaultBilling`
//   address in the SAME array before it ever reaches the database; this
//   is service-managed, not a DB constraint (see schema.prisma's own
//   comment on CustomerAddress for why the lighter-weight approach is
//   proportionate here, unlike inventory's counters).
@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(dto: CreateCustomerDto, tenantId: string): Promise<CustomerResponseDto> {
    this.assertAtMostOneDefaultPerType(dto.addresses);
    await this.assertUserBelongsToTenant(dto.userId, tenantId);

    try {
      const customer = await this.customerRepository.createWithRelations({
        tenantId,
        userId: dto.userId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status ?? CustomerStatus.ACTIVE,
        addresses: dto.addresses
          ? {
              create: dto.addresses.map((a) => ({
                tenantId,
                label: a.label,
                line1: a.line1,
                line2: a.line2,
                city: a.city,
                region: a.region,
                postalCode: a.postalCode,
                country: a.country,
                phone: a.phone,
                isDefaultShipping: a.isDefaultShipping ?? false,
                isDefaultBilling: a.isDefaultBilling ?? false,
              })),
            }
          : undefined,
      });
      return toCustomerResponseDto(customer, customer.addresses);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A customer with email "${dto.email}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findActiveById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return toCustomerResponseDto(customer, customer.addresses);
  }

  async list(
    query: CustomerListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.CustomerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.customerRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toCustomerResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string): Promise<CustomerResponseDto> {
    const existing = await this.customerRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    this.assertAtMostOneDefaultPerType(dto.addresses);
    await this.assertUserBelongsToTenant(dto.userId, tenantId);

    try {
      const updated = await this.customerRepository.updateWithRelations(id, {
        email: dto.email,
        userId: dto.userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status,
      });

      if (dto.addresses) {
        await this.customerRepository.replaceAddresses(
          tenantId,
          id,
          dto.addresses.map((a) => ({
            label: a.label,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            region: a.region,
            postalCode: a.postalCode,
            country: a.country,
            phone: a.phone,
            isDefaultShipping: a.isDefaultShipping ?? false,
            isDefaultBilling: a.isDefaultBilling ?? false,
          })),
        );
        const fresh = await this.customerRepository.findActiveById(id, tenantId);
        return toCustomerResponseDto(fresh!, fresh!.addresses);
      }

      return toCustomerResponseDto(updated, updated.addresses);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A customer with email "${dto.email}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.customerRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    await this.customerRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private assertAtMostOneDefaultPerType(addresses: CreateCustomerAddressDto[] | undefined): void {
    if (!addresses?.length) {
      return;
    }
    const shippingDefaults = addresses.filter((a) => a.isDefaultShipping).length;
    const billingDefaults = addresses.filter((a) => a.isDefaultBilling).length;
    if (shippingDefaults > 1) {
      throw new BadRequestException('Only one address may be the default shipping address');
    }
    if (billingDefaults > 1) {
      throw new BadRequestException('Only one address may be the default billing address');
    }
  }

  private async assertUserBelongsToTenant(
    userId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }
    const belongs = await this.customerRepository.userBelongsToTenant(userId, tenantId);
    if (!belongs) {
      throw new BadRequestException(`User ${userId} not found`);
    }
  }
}
