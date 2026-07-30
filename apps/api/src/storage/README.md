# storage/

Real (Phase 7) — top-level infrastructure, same placement reasoning as
`email/` (cross-cutting, no tenant scoping of its own).

- `storage.service.ts` — `StorageService.upload({key, body, contentType})`,
  a thin wrapper over `@aws-sdk/client-s3`. Reads config from
  `config/storage/storage.config.ts` (all fields optional — see
  `env.validation.ts`'s own comment). Throws `ServiceUnavailableException`
  (503) when storage isn't configured, unlike `email/`'s silent-skip —
  an upload has nothing meaningful to do without real credentials.
- `storage.module.ts` — `@Global()`, same precedent as `EmailModule`.

First real consumer: `modules/catalog/product-image.controller.ts`
(`POST /products/:id/images`).
