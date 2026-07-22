import { CustomerActivity } from '../../../../generated/prisma/client';
import { CustomerActivityResponseDto } from '../dto/customer-activity-response.dto';

export function toCustomerActivityResponseDto(
  activity: CustomerActivity,
): CustomerActivityResponseDto {
  return new CustomerActivityResponseDto(
    activity.id,
    activity.customerId,
    activity.type,
    activity.summary,
    activity.actorUserId,
    activity.relatedLeadId,
    activity.metadata,
    activity.createdAt,
  );
}
