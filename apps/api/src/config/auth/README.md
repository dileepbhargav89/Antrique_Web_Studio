# Auth configuration

Placeholder — describes the purpose of this directory. No implementation.

Managed IdP / session configuration (issuer URL, client id/secret) — see
`.env.example`'s `IDP_*` variables, still unvalidated. Distinct from
`security/` (cross-cutting policy, not identity).

**JWT configuration graduated separately** (Phase 1.2D.6) — it lives in
`apps/api/src/jwt/config/jwt.config.ts`, not here, following the same
"owned by and consumed only by its own module, not this frozen folder's
`config.module.ts`" pattern `logging/config/logger-options.config.ts`
already established (see `configuration.md` §1). This placeholder stays
reserved for the IdP settings specifically.
