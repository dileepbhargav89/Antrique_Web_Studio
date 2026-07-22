import { AuditLog } from '../../../../generated/prisma/client';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';

export function toAuditLogResponseDto(entry: AuditLog): AuditLogResponseDto {
  return new AuditLogResponseDto(
    entry.id,
    entry.actorUserId,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    entry.before,
    entry.after,
    entry.ipAddress,
    entry.userAgent,
    entry.createdAt,
  );
}
