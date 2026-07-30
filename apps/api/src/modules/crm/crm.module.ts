import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerNoteController } from './customer-note.controller';
import { CustomerNoteService } from './customer-note.service';
import { CustomerNoteRepository } from './repositories/customer-note.repository';
import { CustomerActivityController } from './customer-activity.controller';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { FollowUpRepository } from './repositories/follow-up.repository';
import { CustomerTagController } from './customer-tag.controller';
import { CustomerTagService } from './customer-tag.service';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientRepository } from './repositories/client.repository';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { QuotationRepository } from './repositories/quotation.repository';

// CRM & Customer Operations (Milestone 9) — "The CRM module owns
// customer engagement and sales activities. It must not duplicate
// customer, order, or authentication logic" (this milestone's own
// framing). Five controller/service/repository triads — Lead,
// CustomerNote, CustomerActivity, FollowUp, and CustomerTag (the last
// one added beyond this milestone's own named list — see
// CustomerTagRepository's own header comment) — one module, NOT
// @Global(), like every prior business module.
//
// Phase 7 (Enterprise CRM/Project-Management) added a sixth triad —
// Client, the agency's customer-organization profile — found already
// fully modeled (Phase 1.1A) with zero application-layer consumers, same
// situation Lead itself was in before this milestone. `ClientRepository`
// is also injected into `LeadService` (still the same module, no new
// import) for the new `convertToClient()` action, alongside the
// pre-existing `CustomerRepository` (from `OrdersModule`) `convert()`
// already used.
//
// Imports ONE other module — OrdersModule (for its exported
// `CustomerRepository`, "Use: CustomerRepository," this milestone's own
// integration requirement) — one-directional; `OrdersModule` does not
// import `CrmModule`, and nothing in `CatalogModule`/`BespokeModule`/
// `InventoryModule` is touched at all (this milestone reuses none of
// their exports) — "Zero circular dependencies" holds. `LeadRepository`
// reaches `this.prisma.leadSource` directly for the one narrow
// existence-check `LeadService` needs (`LeadSource` has no repository of
// its own — see docs/implementation/decisions.md), the same "check
// directly, don't import a whole module for one narrow check" precedent
// Milestone 7's own `domain-module-guide.md` §18 established.
//
// `exports: [LeadRepository, FollowUpRepository, ClientRepository]` —
// LeadRepository/FollowUpRepository (Milestone 11) are for AdminModule's
// "CRM: Lead conversion, Active follow-ups" analytics (both consumed via
// their own already-public, inherited `BaseRepository.count()`).
// ClientRepository (Phase 7, Project/Task/Milestone) is for ProjectsModule
// — `POST /projects` needs to verify `clientId` (and `leadId`, via the
// already-exported LeadRepository) actually exist/belong to this tenant
// before creating a Project against them, same "import the owning module
// for its exported repository" pattern BillingModule already established
// for CatalogModule/OrdersModule.
@Module({
  imports: [OrdersModule],
  controllers: [
    LeadController,
    CustomerNoteController,
    CustomerActivityController,
    FollowUpController,
    CustomerTagController,
    ClientController,
    QuotationController,
  ],
  providers: [
    LeadService,
    LeadRepository,
    CustomerNoteService,
    CustomerNoteRepository,
    CustomerActivityService,
    CustomerActivityRepository,
    FollowUpService,
    FollowUpRepository,
    CustomerTagService,
    CustomerTagRepository,
    ClientService,
    ClientRepository,
    QuotationService,
    QuotationRepository,
  ],
  exports: [LeadRepository, FollowUpRepository, ClientRepository],
})
export class CrmModule {}
