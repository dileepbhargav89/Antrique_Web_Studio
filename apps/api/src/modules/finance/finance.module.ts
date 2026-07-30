import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './repositories/vendor.repository';

// Phase 9, Module 1 (Enterprise Operations Suite — Finance) — this
// module owns vendor/expense/purchase-order records only, distinct from
// `BillingModule` (Invoice/Payment/Tax) and `InventoryModule` (Supplier —
// product/inventory sourcing, a different concept, see Vendor's own
// schema comment). One controller/service/repository triad so far
// (Step 1 — Vendor Management); Steps 2-7 (Purchase Orders, Expenses,
// Invoice PDF+email, Refunds, GST tax config, Revenue/P&L/Cash-Flow
// dashboards) add to this same module, not new ones. NOT @Global(),
// like every prior business module.
@Module({
  controllers: [VendorController],
  providers: [VendorService, VendorRepository],
  exports: [VendorRepository],
})
export class FinanceModule {}
