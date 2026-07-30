-- Phase 10, Module 4 (Authentication & Session Security) — account
-- lockout policy fields on User. See schema.prisma's own comment on
-- these two columns for why this exists alongside (not instead of)
-- the IP-based login throttle.
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMP(3);
