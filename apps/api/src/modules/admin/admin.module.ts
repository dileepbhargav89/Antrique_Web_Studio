import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BillingModule } from '../billing/billing.module';
import { CrmModule } from '../crm/crm.module';
import { CatalogModule } from '../catalog/catalog.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { ReportController } from './report.controller';
import { ReportingService } from './reporting.service';
import { ReportRepository } from './repositories/report.repository';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';

// Admin Platform, Analytics & Notifications (Milestone 11) — "This
// module provides operational visibility. It does not own business
// transactions" (this milestone's own framing). Four controller/service/
// repository triads — Notification, Audit (covering both `AuditLog` and
// `SystemEvent`), Dashboard, Report — one module, NOT @Global(), like
// every prior business module.
//
// Imports FIVE other modules — the most cross-module-dependent module in
// this arc, directly matching this milestone's own "Cross-Module
// Integration" analytics requirements: OrdersModule (exported
// `OrderRepository`, "Orders: Revenue, Order count, Average order
// value"), InventoryModule (exported `InventoryService`, "Inventory:
// Stock valuation, Low stock items"), BillingModule (exported
// `InvoiceRepository`, "Billing: Outstanding invoices, Collection
// rate"), CrmModule (exported `LeadRepository`/`FollowUpRepository`,
// "CRM: Lead conversion, Active follow-ups"), and CatalogModule
// (exported `ProductRepository`, this module's own 5th — "catalog" —
// aggregated KPI, see dashboard.service.ts's own comment). One-
// directional; none of those five modules import AdminModule — "Zero
// circular dependencies" holds. `ReportingService` also depends on
// `DashboardService` (both providers of THIS module — no export/import
// round-trip needed) to reuse its own KPI computation rather than
// duplicating it ("Never duplicate calculations already available
// elsewhere," this milestone's own explicit instruction).
@Module({
  imports: [OrdersModule, InventoryModule, BillingModule, CrmModule, CatalogModule],
  controllers: [
    NotificationController,
    AuditController,
    DashboardController,
    ReportController,
    RuntimeController,
  ],
  providers: [
    NotificationService,
    NotificationRepository,
    AuditService,
    AuditRepository,
    DashboardService,
    DashboardRepository,
    ReportingService,
    ReportRepository,
    RuntimeService,
  ],
})
export class AdminModule {}
