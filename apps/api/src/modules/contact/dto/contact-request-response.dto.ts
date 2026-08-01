import { ContactRequestStatus } from '../../../../generated/prisma/enums';

// Response DTO for POST /contact-requests, GET /contact-requests, and
// GET /contact-requests/:id. A plain shape, not the Prisma row directly —
// same "never serialize tenantId/deletedAt/version to a client" reasoning
// as category-response.dto.ts. `company`/`message`/`source`/
// `convertedLeadId` were added alongside the list/get/convert routes
// (previously unused fields on a create-only response) — the inbox/triage
// UI needs the full submission, not just name/email/status.
export class ContactRequestResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly phone: string | null,
    readonly company: string | null,
    readonly message: string,
    readonly source: string | null,
    readonly status: ContactRequestStatus,
    readonly convertedLeadId: string | null,
    readonly createdAt: Date,
  ) {}
}
