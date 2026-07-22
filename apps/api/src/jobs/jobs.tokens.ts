// Same DI-token-for-an-interface pattern as logging/tokens/logging.tokens.ts
// (LOGGER, LOG_TRANSPORT, AUDIT_LOGGER) — an interface has no runtime
// identity TypeScript can hand to Nest's DI container, so a real swap-point
// needs an explicit token to bind against.
export const DEAD_LETTER_STORE = Symbol('DEAD_LETTER_STORE');
