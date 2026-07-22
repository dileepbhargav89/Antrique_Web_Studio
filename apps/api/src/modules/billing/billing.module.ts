import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { TaxRateController } from './tax-rate.controller';
import { TaxService } from './tax.service';
import { TaxRepository } from './repositories/tax.repository';

// Payments & Billing Foundation (Milestone 10) — "This module owns
// financial records only. It must not become a payment gateway
// implementation" (this milestone's own framing). Three controller/
// service/repository triads — Invoice, Payment, Tax — one module, NOT
// @Global(), like every prior business module.
//
// Imports TWO other modules — OrdersModule (now `exports:
// [CustomerRepository, OrderRepository]`) for "Invoices belong to
// Orders"/"Use: OrderRepository, CustomerRepository" (this milestone's
// own explicit integration requirement), and CatalogModule (exported
// `ProductRepository`) to resolve a human-readable invoice line-item
// description from the originating order line's own product variant SKU
// — the SAME repository `OrdersModule` itself already imports for an
// identical reason, reuse not a new dependency surface. Deliberately
// does NOT import CrmModule — "CRM remains independent," this
// milestone's own explicit instruction. One-directional; neither
// OrdersModule nor CatalogModule imports BillingModule — "Zero circular
// dependencies" holds.
//
// `exports: [InvoiceRepository]` (Milestone 11) — AdminModule needs it
// for "Billing: Outstanding invoices, Collection rate" analytics (new
// `getOutstandingSummary()`/`getCollectionSummary()` aggregate methods —
// see that repository's own comment).
@Module({
  imports: [OrdersModule, CatalogModule],
  controllers: [InvoiceController, PaymentController, TaxRateController],
  providers: [
    InvoiceService,
    InvoiceRepository,
    PaymentService,
    PaymentRepository,
    TaxService,
    TaxRepository,
  ],
  exports: [InvoiceRepository],
})
export class BillingModule {}
