import { ContactRequestStatus } from '../../../../generated/prisma/enums';

// Response DTO for POST /contact-requests. A plain shape, not the Prisma
// row directly — same "never serialize tenantId/deletedAt/version to a
// client" reasoning as category-response.dto.ts.
export class ContactRequestResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly status: ContactRequestStatus,
    readonly createdAt: Date,
  ) {}
}
