import { Module } from '@nestjs/common';
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
@Module({
  controllers: [ContactRequestController],
  providers: [ContactRequestService, ContactRequestRepository],
})
export class ContactModule {}
