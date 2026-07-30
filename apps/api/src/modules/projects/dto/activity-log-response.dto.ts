export class ActivityLogResponseDto {
  constructor(
    readonly id: string,
    readonly projectId: string | null,
    readonly actorUserId: string | null,
    readonly verb: string,
    readonly summary: string,
    readonly metadata: unknown,
    readonly createdAt: Date,
  ) {}
}
