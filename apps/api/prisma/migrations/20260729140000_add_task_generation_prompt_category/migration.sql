-- Phase 8, Step 6 (AI Task Generator) — adds TASK_GENERATION to
-- PromptCategory. Run standalone, before anything else references it —
-- Postgres requires a new enum value to be committed before use, same
-- precedent 20260722100000_add_crm_customer_operations established for
-- LeadStatus.ARCHIVED.
ALTER TYPE "PromptCategory" ADD VALUE IF NOT EXISTS 'TASK_GENERATION';
