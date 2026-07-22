import { Lead } from '../../../../generated/prisma/client';
import { LeadResponseDto } from '../dto/lead-response.dto';

export function toLeadResponseDto(lead: Lead): LeadResponseDto {
  return new LeadResponseDto(
    lead.id,
    lead.contactName,
    lead.contactEmail,
    lead.organization,
    lead.source,
    lead.leadSourceId,
    lead.serviceInterest,
    lead.industry,
    lead.status,
    lead.assigneeId,
    lead.convertedClientId,
    lead.convertedCustomerId,
    lead.metadata,
    lead.createdAt,
    lead.updatedAt,
  );
}
