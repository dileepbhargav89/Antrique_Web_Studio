-- Phase 8, Step 7 (AI Content Assistant) — adds CONTENT_GENERATION to
-- PromptCategory. Run standalone, before anything else references it —
-- same precedent 20260729140000_add_task_generation_prompt_category
-- established for TASK_GENERATION.
ALTER TYPE "PromptCategory" ADD VALUE IF NOT EXISTS 'CONTENT_GENERATION';
