// DI token for the CacheStore CacheService is backed by — see
// cache-store.interface.ts. A plain Symbol (not the class itself), the
// same "swap point behind a token" precedent LOGGER/AUDIT_LOGGER already
// established in logging/tokens/logging.tokens.ts, since the concrete
// implementation (RedisCacheStore in production, InMemoryCacheStore in
// most tests) is exactly what needs to vary by context.
export const CACHE_STORE = Symbol('CACHE_STORE');
