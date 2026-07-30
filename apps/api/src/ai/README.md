# AI provider abstraction

Phase 8 (AI Workspace), Step 1. Strategy/factory pattern over four LLM
providers — no business logic anywhere in this app should depend on a
concrete provider, only `AiService`/`AiProviderFactory`/`AiProvider`
(see `index.ts`).

- `ai-provider.interface.ts` — the one contract every adapter implements
  (`AiProviderAdapter`) and the shared input/output shapes
  (`AiCompletionInput`/`AiCompletionResult`).
- `adapters/` — one class per provider (Anthropic, OpenAI, Gemini,
  OpenRouter). Anthropic is the real, tested reference implementation
  (`@anthropic-ai/sdk`); the other three are structurally complete against
  each provider's real REST API shape via plain `fetch()`, but unverified
  until a real key is configured.
- `ai-provider.factory.ts` — resolves/caches the adapter for a given
  provider (or `ai.defaultProvider` from config when none is given).
- `ai.service.ts` — the one entrypoint real features call:
  `AiService.complete(input, provider?)`.

## Configuration

See `apps/api/src/config/ai/ai.config.ts` and `.env.example`'s AI section.
Every provider's API key is optional — `AiService.complete()` throws a 503
at call time for whichever provider isn't configured, the app still boots
and every other route keeps working (same treatment `EmailService`/
`StorageService` already get).

## Consumers

`modules/prompts/` (Step 2 — Prompt Library) is the first real consumer:
`POST /prompt-templates/:id/test` renders a template and calls
`AiService.complete()` against it. Steps 3+ (proposal generator,
requirement analyzer, ...) will call `AiService` the same way — none of
them should ever import an adapter or `@anthropic-ai/sdk` directly.
