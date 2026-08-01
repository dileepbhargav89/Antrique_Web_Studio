import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { ContactRequestController } from './contact-request.controller';
import { ContactRequestService } from './contact-request.service';
import { ContactRequestRepository } from './repositories/contact-request.repository';

// Phase 7 (Real Email) — the first real consumer of ContactRequest, a
// model that existed since Phase 1.1A with zero application code (see
// this module's own README). Not @Global() — domain modules are scoped
// by default, matching every other real business module's own precedent.
// No explicit `imports: [EmailModule]` — EmailModule is @Global(), so
// SendEmailJob/EmailService are already injectable here without
// re-importing it (same reasoning AuthorizationModule's consumers never
// re-import it either).
//
// Imports CrmModule (Phase 7 follow-up) for its exported LeadRepository/
// CustomerActivityRepository — POST /contact-requests/:id/convert creates
// a real Lead from a triaged ContactRequest, the same "import the owning
// module for its exported repository" pattern ProjectsModule already
// established for CrmModule's ClientRepository.
@Module({
  imports: [CrmModule],
  controllers: [ContactRequestController],
  providers: [ContactRequestService, ContactRequestRepository],
})
export class ContactModule {}
