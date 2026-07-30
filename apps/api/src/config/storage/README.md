# Storage configuration

Real (Phase 7). `storage.config.ts` — `registerAs('storage', ...)`,
reading `STORAGE_BUCKET`/`STORAGE_REGION`/`STORAGE_ACCESS_KEY_ID`/
`STORAGE_SECRET_ACCESS_KEY`/`STORAGE_ENDPOINT`/`STORAGE_PUBLIC_URL_BASE`
(all optional — see `env.validation.ts`'s own comment). Consumed by
`apps/api/src/storage/storage.service.ts`, the real S3-compatible client
wrapper (`@aws-sdk/client-s3`) backing `POST /products/:id/images`.
