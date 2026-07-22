-- Milestone 1 (Real Authentication): adds a local Argon2id password path
-- alongside the existing managed-IdP path on `users`. `idp_subject` becomes
-- optional (a user may authenticate via IdP, local password, or — during a
-- future migration — both) since it's no longer the only credential a user
-- can have. See docs/implementation/decisions.md for the full rationale.
--
-- Hand-written, not `prisma migrate dev`'s raw auto-diff: the auto-diff also
-- proposed `CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"
-- ("tenant_id", "email")` — a plain, non-partial index with the same name
-- as the case-insensitive PARTIAL unique index the
-- `20260717090500_partial_unique_indexes` migration already created
-- (`WHERE "deleted_at" IS NULL`). That's the documented, permanent
-- Prisma-DSL-vs-actual-database divergence that migration's own header
-- comment warns every future migration touching `users` to check for and
-- drop — done here, not applied.
ALTER TABLE "users"
  ADD COLUMN "password_hash" TEXT,
  ALTER COLUMN "idp_subject" DROP NOT NULL;
