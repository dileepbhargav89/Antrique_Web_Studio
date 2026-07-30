// Phase 10, Module 4 (Authentication & Session Security) — the fields a
// `Session` row (schema.prisma) records about where it was issued from.
// `undefined`, never a placeholder string, when the underlying header/
// property is genuinely absent — matches `RequestUser`/`TenantContext`'s
// own "absent means absent" convention.
export interface RequestMeta {
  readonly userAgent?: string;
  readonly ipAddress?: string;
}
