import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const CUSTOMER_RELATIONS_INCLUDE = {
  addresses: true,
} satisfies Prisma.CustomerInclude;

// Data-access only. `CustomerAddress` has no repository/controller of
// its own this milestone (this milestone's brief lists only
// `CustomerRepository`/`OrderRepository` for 6 entities) — created only
// as nested data under Customer's own create/update, same "line-item, no
// independent repository" shape `Fabric`/`Supplier` already established
// for their own nested images/products.
@Injectable()
export class CustomerRepository extends BaseRepository<PrismaService['customer']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.customer);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: CUSTOMER_RELATIONS_INCLUDE,
    });
  }

  createWithRelations(data: Prisma.CustomerUncheckedCreateInput) {
    return this.delegate.create({ data, include: CUSTOMER_RELATIONS_INCLUDE });
  }

  updateWithRelations(id: string, data: Prisma.CustomerUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data, include: CUSTOMER_RELATIONS_INCLUDE });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.CustomerWhereInput,
    orderBy: Prisma.CustomerOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CustomerWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Full replace of a customer's addresses — delete-then-create in one
  // transaction, same approach `bespoke/repositories/fabric.repository.ts`'s
  // `setProductLinks()`/`inventory/repositories/supplier.repository.ts`'s
  // `replaceSupplierProducts()` both use. "Default addresses" (this
  // milestone's own business responsibility) is enforced by
  // CustomerService BEFORE calling this — at most one address in the
  // given array may have `isDefaultShipping`/`isDefaultBilling` true —
  // this method just writes whatever it's given.
  async replaceAddresses(
    tenantId: string,
    customerId: string,
    addresses: Array<Omit<Prisma.CustomerAddressCreateManyInput, 'tenantId' | 'customerId'>>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.customerAddress.deleteMany({ where: { customerId, tenantId } }),
      this.prisma.customerAddress.createMany({
        data: addresses.map((a) => ({ ...a, tenantId, customerId })),
      }),
    ]);
  }

  // Used by CustomerService to validate a client-supplied `userId`
  // genuinely belongs to the caller's tenant before letting a Customer
  // reference it — same pattern
  // `bespoke/repositories/measurement.repository.ts`'s
  // `userBelongsToTenant()` already established.
  async userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true },
    });
    return user !== null;
  }

  // Milestone 9 — the two `tx`-taking variants CrmModule's
  // `LeadService.convert()` needs to create-or-link a Customer inside
  // its OWN open transaction (the same cross-module transaction-
  // threading shape `InventoryService`'s own `tx`-taking methods
  // established for Milestone 8's order creation — see
  // docs/architecture/domain-module-guide.md §19). Purely additive:
  // every existing non-`tx` method above is untouched, so
  // `OrdersModule`'s own `CustomerService` is unaffected.
  findActiveByEmailInTx(tx: Prisma.TransactionClient, email: string, tenantId: string) {
    return tx.customer.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
  }

  createWithRelationsInTx(tx: Prisma.TransactionClient, data: Prisma.CustomerUncheckedCreateInput) {
    return tx.customer.create({ data, include: CUSTOMER_RELATIONS_INCLUDE });
  }
}
