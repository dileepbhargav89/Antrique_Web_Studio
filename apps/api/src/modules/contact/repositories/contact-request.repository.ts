import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Data-access only — same shape as category.repository.ts. Create-only
// this phase (no list/get/update route exists yet — see
// contact-request.service.ts's own header comment for why), so this
// repository only actually needs BaseRepository's inherited `create()`;
// it's still its own class (not used inline) to match every other real
// repository's shape and stay consistent if a list/triage endpoint is
// ever added.
@Injectable()
export class ContactRequestRepository extends BaseRepository<PrismaService['contactRequest']> {
  constructor(prisma: PrismaService) {
    super(prisma.contactRequest);
  }
}
