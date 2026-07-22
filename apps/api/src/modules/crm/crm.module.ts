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

// CRM & Customer Operations (Milestone 9) — "The CRM module owns
// customer engagement and sales activities. It must not duplicate
// customer, order, or authentication logic" (this milestone's own
// framing). Five controller/service/repository triads — Lead,
// CustomerNote, CustomerActivity, FollowUp, and CustomerTag (the last
// one added beyond this milestone's own named list — see
// CustomerTagRepository's own header comment) — one module, NOT
// @Global(), like every prior business module.
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
// `exports: [LeadRepository, FollowUpRepository]` (Milestone 11) —
// AdminModule needs both for "CRM: Lead conversion, Active follow-ups"
// analytics — both consumed via their own already-public, inherited
// `BaseRepository.count()` (a lead-conversion rate and an
// active-follow-up count are both plain `count()` calls with a `where`
// clause; no new aggregate method was needed on either repository, only
// the export itself).
@Module({
  imports: [OrdersModule],
  controllers: [
    LeadController,
    CustomerNoteController,
    CustomerActivityController,
    FollowUpController,
    CustomerTagController,
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
  ],
  exports: [LeadRepository, FollowUpRepository],
})
export class CrmModule {}
