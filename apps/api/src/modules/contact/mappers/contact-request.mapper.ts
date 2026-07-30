import { ContactRequest } from '../../../../generated/prisma/client';
import { ContactRequestResponseDto } from '../dto/contact-request-response.dto';

// The one place a ContactRequest row becomes a ContactRequestResponseDto —
// same "one conversion, one place" precedent as category.mapper.ts.
export function toContactRequestResponseDto(
  contactRequest: ContactRequest,
): ContactRequestResponseDto {
  return new ContactRequestResponseDto(
    contactRequest.id,
    contactRequest.name,
    contactRequest.email,
    contactRequest.status,
    contactRequest.createdAt,
  );
}
