export class AuditLogResponseDto {
  constructor(
    readonly id: string,
    readonly actorUserId: string | null,
    readonly action: string,
    readonly resourceType: string,
    readonly resourceId: string | null,
    readonly before: unknown,
    readonly after: unknown,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
    readonly createdAt: Date,
  ) {}
}
