// Milestone 14 (Production Infrastructure) — "Expose runtime metadata
// endpoint (Admin only)." Deliberately narrow: identity (version/commit/
// environment), process health (uptime), and the one real dependency this
// app has (database connectivity) — not a full introspection surface. No
// secrets, no config values, no request/user data — this is reachable by
// any Admin/Super Admin in any tenant (system-level, not tenant-scoped
// data), so it must stay safe to show broadly within that tier.
//
// Positional constructor, matching every other response DTO in this
// module (mappers/*.ts) — built directly in RuntimeService rather than a
// mappers/ function, since there is no Prisma entity to map FROM here
// (the mapper pattern exists specifically for entity → DTO; this DTO's
// fields come from config/process/a health check instead).
export class RuntimeInfoResponseDto {
  constructor(
    public readonly version: string,
    public readonly gitCommitSha: string,
    public readonly nodeEnv: string,
    public readonly uptimeSeconds: number,
    public readonly timestamp: string,
    public readonly database: 'ok' | 'error',
  ) {}
}
