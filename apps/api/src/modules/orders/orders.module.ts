import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { BespokeModule } from '../bespoke/bespoke.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './repositories/customer.repository';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';

// Order Management & Checkout (Milestone 8) — "The Order module becomes
// the orchestration layer that coordinates existing domains rather than
// reimplementing their logic" (this milestone's own framing). Two
// controller/service/repository triads (Customer/Order), one module —
// NOT @Global(), like every prior business module.
//
// Imports THREE other modules — CatalogModule (ProductRepository, for
// "Validate product variants"), BespokeModule (ProductCustomizationRepository,
// for "Validate bespoke customization"/"Validate pricing adjustments"),
// InventoryModule (InventoryService, for "Reserve inventory through
// InventoryService") — the most cross-module-dependent module in this
// arc, directly matching this milestone's own "Integration
// Requirements: Reuse existing modules... Use: ProductRepository,
// ProductCustomizationRepository, InventoryService." One-directional
// (orders → catalog/bespoke/inventory); none of those three modules
// import OrdersModule, and OrdersModule is the only module that imports
// all three — still a clean DAG, "Zero circular dependencies" (this
// milestone's own requirement) holds.
//
// `exports: [CustomerRepository]` (Milestone 9) — CrmModule needs it for
// "Convert Lead → Customer" (LeadService creates/links a Customer row)
// and for validating a client-supplied customerId belongs to the caller's
// tenant before attaching a CustomerNote/CustomerActivity/FollowUpTask —
// same "export the repository, import the module" pattern
// CatalogModule/BespokeModule/InventoryModule already established for
// THIS module's own imports above. `OrderRepository` was deliberately NOT
// exported at that point — Milestone 9's own business rules never read
// Order data. Milestone 10 is the real consumer that scoping note
// anticipated: `exports: [OrderRepository]` added below for "Create
// [Invoice] from Order," this milestone's own explicit entry point — see
// docs/implementation/decisions.md.
@Module({
  imports: [CatalogModule, BespokeModule, InventoryModule],
  controllers: [CustomerController, OrderController],
  providers: [CustomerService, CustomerRepository, OrderService, OrderRepository],
  exports: [CustomerRepository, OrderRepository],
})
export class OrdersModule {}
