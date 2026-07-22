import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { SupplierRepository } from './repositories/supplier.repository';

// Inventory & Stock Management (Milestone 7) — same shape as
// CatalogModule/BespokeModule: three parallel controller/service/
// repository triads (Warehouse/Inventory/Supplier), one module. Not
// @Global() — domain modules are scoped by default.
//
// Unlike BespokeModule, this module imports NOTHING — its two
// cross-entity references (`ProductVariant` from catalog, `Fabric` from
// bespoke) are validated via small existence-check methods
// (`productVariantExistsForTenant()`/`fabricExistsForTenant()`) that
// reach `this.prisma.productVariant`/`this.prisma.fabric` directly from
// InventoryRepository/SupplierRepository, rather than importing
// CatalogModule AND BespokeModule purely for two narrow checks — see
// those repositories' own header comments and
// docs/implementation/decisions.md. Zero circular dependencies, and zero
// cross-module imports at all.
@Module({
  controllers: [WarehouseController, InventoryController, SupplierController],
  providers: [
    WarehouseService,
    WarehouseRepository,
    InventoryService,
    InventoryRepository,
    SupplierService,
    SupplierRepository,
  ],
  // Milestone 8 (Order Management & Checkout) — OrdersModule imports this
  // module to reuse InventoryService for "Reserve inventory through
  // InventoryService" (this milestone's own explicit directive) —
  // OrderService.create()/cancel() call InventoryService.reserveStock()/
  // releaseReservation() with an optional `tx` (see inventory.service.ts's
  // own comment) so order creation/cancellation and their inventory
  // side-effects commit as one atomic unit. Only InventoryService is
  // exported — "real, used values only" — OrderService never touches
  // InventoryRepository/WarehouseRepository directly; a not-found
  // InventoryItem lookup (`findItemForVariant()`) covers both "warehouse
  // doesn't exist" and "no stock tracked" without needing a separate
  // WarehouseRepository export too.
  exports: [InventoryService],
})
export class InventoryModule {}
