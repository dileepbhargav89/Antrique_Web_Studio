# API Contract

Single source of truth for the Antrique REST API.

- `openapi/openapi.yaml` — OpenAPI 3.1 spec (validated). Drives docs, the
  generated typed client, and contract tests.
- `generated/` — typed client + models generated from the spec (build step).

## Conventions encoded in the spec
- Tenant-implicit: scope comes from the token, never the URL.
- Cursor pagination; whitelisted filter/sort fields.
- RFC 9457 problem-details errors with a trace_id.
- 404 (not 403) for foreign-tenant rows.
- Hosted-gateway payments: the API never accepts raw card data.
- Soft-delete on DELETE; optimistic locking via `version` → 409 on conflict.
