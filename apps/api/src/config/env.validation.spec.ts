// cachedEnv is module-level state (see env.validation.ts), so each test that
// needs a distinct env input resets the module registry and re-requires the
// module fresh — otherwise the first test's result would leak into every
// test after it via the cache, regardless of what config object is passed.
function freshValidateEnv(): typeof import('./env.validation').validateEnv {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./env.validation').validateEnv;
}

const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/antrique',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  DEFAULT_TENANT_ID: '00000000-0000-7000-8000-000000000001',
};

describe('validateEnv', () => {
  it('throws when required vars (DATABASE_URL, REDIS_URL) are missing', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('applies documented defaults when only the required vars are set', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      LOG_LEVEL: 'info',
      CORS_ALLOWED_ORIGINS: [],
      DATABASE_SSL: false,
      RATE_LIMIT_WINDOW_MS: 60000,
      RATE_LIMIT_MAX: 100,
      LOG_FORMAT: 'json',
      SWAGGER_ENABLED: true,
      SWAGGER_PATH: '/api/docs',
      HEALTH_PATH: '/health',
      METRICS_ENABLED: true,
      DATABASE_STATEMENT_TIMEOUT_MS: 10_000,
      JWT_ACCESS_TOKEN_TTL: 900,
      JWT_REFRESH_TOKEN_TTL: 2592000,
      HASH_MEMORY_COST: 19456,
      HASH_TIME_COST: 2,
      HASH_PARALLELISM: 1,
    });
  });

  it('coerces a numeric DATABASE_STATEMENT_TIMEOUT_MS string to a number', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV, DATABASE_STATEMENT_TIMEOUT_MS: '15000' });
    expect(env.DATABASE_STATEMENT_TIMEOUT_MS).toBe(15000);
  });

  it('rejects a non-positive DATABASE_STATEMENT_TIMEOUT_MS', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, DATABASE_STATEMENT_TIMEOUT_MS: '0' })).toThrow(
      /DATABASE_STATEMENT_TIMEOUT_MS must be greater than 0/,
    );
  });

  it('coerces a numeric PORT string to a number', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('rejects a non-numeric PORT with a human-readable message', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, PORT: 'notanumber' })).toThrow(
      /PORT must be a valid port number/,
    );
  });

  it('rejects a decimal PORT', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, PORT: '80.5' })).toThrow(
      /PORT must be a whole number/,
    );
  });

  it('rejects a PORT of 0 or below', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, PORT: '0' })).toThrow(
      /PORT must be greater than 0/,
    );
  });

  it('rejects a PORT above 65535', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, PORT: '70000' })).toThrow(
      /PORT must be 65535 or less/,
    );
  });

  it('does not coerce DATABASE_SSL="false" to true (the z.coerce.boolean trap)', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV, DATABASE_SSL: 'false' });
    expect(env.DATABASE_SSL).toBe(false);
  });

  it('accepts DATABASE_SSL="true"', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV, DATABASE_SSL: 'true' });
    expect(env.DATABASE_SSL).toBe(true);
  });

  it('rejects a DATABASE_SSL value that is neither "true" nor "false"', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, DATABASE_SSL: '1' })).toThrow();
  });

  it('splits, trims, dedupes, and drops empty entries in CORS_ALLOWED_ORIGINS', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({
      ...REQUIRED_ENV,
      CORS_ALLOWED_ORIGINS: 'https://a.com, https://b.com,, https://a.com ',
    });
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });

  it('rejects a non-URL DATABASE_URL', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, DATABASE_URL: 'not-a-url' })).toThrow(
      /DATABASE_URL must be a valid connection string URL/,
    );
  });

  it('rejects a non-URL REDIS_URL', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, REDIS_URL: 'not-a-url' })).toThrow(
      /REDIS_URL must be a valid connection string URL/,
    );
  });

  it('rejects an invalid NODE_ENV/LOG_LEVEL/LOG_FORMAT enum value', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, NODE_ENV: 'staging' })).toThrow();
  });

  it('aggregates every invalid field into a single formatted error, not just the first', () => {
    const validateEnv = freshValidateEnv();
    try {
      validateEnv({ PORT: 'nope', DATABASE_SSL: 'nope' });
      throw new Error('expected validateEnv to throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/PORT must be a valid port number/);
      expect(message).toMatch(/DATABASE_URL/);
      expect(message).toMatch(/REDIS_URL/);
    }
  });

  it('caches the result of the first successful call regardless of later input', () => {
    const validateEnv = freshValidateEnv();
    const first = validateEnv({ ...REQUIRED_ENV, PORT: '4000' });
    const second = validateEnv({ ...REQUIRED_ENV, PORT: '9999' });

    expect(second).toBe(first);
    expect(second.PORT).toBe(4000);
  });

  it('rejects a JWT_ACCESS_SECRET shorter than 32 characters', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, JWT_ACCESS_SECRET: 'too-short' })).toThrow(
      /JWT_ACCESS_SECRET must be at least 32 characters long/,
    );
  });

  it('rejects a JWT_REFRESH_SECRET shorter than 32 characters', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, JWT_REFRESH_SECRET: 'too-short' })).toThrow(
      /JWT_REFRESH_SECRET must be at least 32 characters long/,
    );
  });

  it('throws when JWT_ACCESS_SECRET/JWT_REFRESH_SECRET are missing', () => {
    const validateEnv = freshValidateEnv();
    expect(() =>
      validateEnv({ DATABASE_URL: REQUIRED_ENV.DATABASE_URL, REDIS_URL: REQUIRED_ENV.REDIS_URL }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('coerces JWT_ACCESS_TOKEN_TTL/JWT_REFRESH_TOKEN_TTL numeric strings to numbers', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({
      ...REQUIRED_ENV,
      JWT_ACCESS_TOKEN_TTL: '1800',
      JWT_REFRESH_TOKEN_TTL: '604800',
    });
    expect(env.JWT_ACCESS_TOKEN_TTL).toBe(1800);
    expect(env.JWT_REFRESH_TOKEN_TTL).toBe(604800);
  });

  it('rejects a non-numeric JWT_ACCESS_TOKEN_TTL with a human-readable message', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, JWT_ACCESS_TOKEN_TTL: 'notanumber' })).toThrow(
      /JWT_ACCESS_TOKEN_TTL must be a valid number of seconds/,
    );
  });

  it('rejects a JWT_REFRESH_TOKEN_TTL of 0 or below', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, JWT_REFRESH_TOKEN_TTL: '0' })).toThrow(
      /JWT_REFRESH_TOKEN_TTL must be greater than 0/,
    );
  });

  it('coerces HASH_MEMORY_COST/HASH_TIME_COST/HASH_PARALLELISM numeric strings to numbers', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({
      ...REQUIRED_ENV,
      HASH_MEMORY_COST: '65536',
      HASH_TIME_COST: '3',
      HASH_PARALLELISM: '2',
    });
    expect(env.HASH_MEMORY_COST).toBe(65536);
    expect(env.HASH_TIME_COST).toBe(3);
    expect(env.HASH_PARALLELISM).toBe(2);
  });

  it('rejects a non-numeric HASH_MEMORY_COST with a human-readable message', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, HASH_MEMORY_COST: 'notanumber' })).toThrow(
      /HASH_MEMORY_COST must be a valid number of kilobytes/,
    );
  });

  it('rejects a HASH_TIME_COST of 0 or below', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, HASH_TIME_COST: '0' })).toThrow(
      /HASH_TIME_COST must be greater than 0/,
    );
  });

  it('rejects a decimal HASH_PARALLELISM', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, HASH_PARALLELISM: '1.5' })).toThrow(
      /HASH_PARALLELISM must be a whole number/,
    );
  });

  it('throws when DEFAULT_TENANT_ID is missing', () => {
    const validateEnv = freshValidateEnv();
    const withoutDefaultTenant: Record<string, string> = { ...REQUIRED_ENV };
    delete withoutDefaultTenant.DEFAULT_TENANT_ID;
    expect(() => validateEnv(withoutDefaultTenant)).toThrow(/DEFAULT_TENANT_ID/);
  });

  it('rejects a DEFAULT_TENANT_ID that is not a valid UUID', () => {
    const validateEnv = freshValidateEnv();
    expect(() => validateEnv({ ...REQUIRED_ENV, DEFAULT_TENANT_ID: 'not-a-uuid' })).toThrow(
      /DEFAULT_TENANT_ID must be a valid UUID/,
    );
  });

  it('applies safe local-dev defaults for APP_VERSION/GIT_COMMIT_SHA/SWAGGER_ALLOW_IN_PRODUCTION', () => {
    const validateEnv = freshValidateEnv();
    const env = validateEnv({ ...REQUIRED_ENV });
    expect(env.APP_VERSION).toBe('0.0.0-dev');
    expect(env.GIT_COMMIT_SHA).toBe('unknown');
    expect(env.SWAGGER_ALLOW_IN_PRODUCTION).toBe(false);
  });

  describe('production-safety checks (superRefine, NODE_ENV=production only)', () => {
    const PROD_ENV = {
      ...REQUIRED_ENV,
      NODE_ENV: 'production',
      DATABASE_SSL: 'true',
      SWAGGER_ENABLED: 'false',
      METRICS_TOKEN: 'a-real-metrics-token',
    };

    it('accepts a fully-hardened production configuration', () => {
      const validateEnv = freshValidateEnv();
      expect(() => validateEnv(PROD_ENV)).not.toThrow();
    });

    it('rejects SWAGGER_ENABLED=true in production without SWAGGER_ALLOW_IN_PRODUCTION', () => {
      const validateEnv = freshValidateEnv();
      expect(() => validateEnv({ ...PROD_ENV, SWAGGER_ENABLED: 'true' })).toThrow(
        /SWAGGER_ENABLED must be false in production/,
      );
    });

    it('accepts SWAGGER_ENABLED=true in production when SWAGGER_ALLOW_IN_PRODUCTION=true', () => {
      const validateEnv = freshValidateEnv();
      expect(() =>
        validateEnv({ ...PROD_ENV, SWAGGER_ENABLED: 'true', SWAGGER_ALLOW_IN_PRODUCTION: 'true' }),
      ).not.toThrow();
    });

    it('rejects DATABASE_SSL=false in production', () => {
      const validateEnv = freshValidateEnv();
      expect(() => validateEnv({ ...PROD_ENV, DATABASE_SSL: 'false' })).toThrow(
        /DATABASE_SSL must be true in production/,
      );
    });

    it('does not reject DATABASE_SSL=false outside production', () => {
      const validateEnv = freshValidateEnv();
      expect(() => validateEnv({ ...REQUIRED_ENV, DATABASE_SSL: 'false' })).not.toThrow();
    });

    it('rejects the .env.example placeholder JWT_ACCESS_SECRET in production', () => {
      const validateEnv = freshValidateEnv();
      expect(() =>
        validateEnv({
          ...PROD_ENV,
          JWT_ACCESS_SECRET: 'replace-me-with-a-real-random-secret-32-chars-min',
        }),
      ).toThrow(/JWT_ACCESS_SECRET is still the placeholder value/);
    });

    it('rejects the .env.example placeholder JWT_REFRESH_SECRET in production', () => {
      const validateEnv = freshValidateEnv();
      expect(() =>
        validateEnv({
          ...PROD_ENV,
          JWT_REFRESH_SECRET: 'replace-me-with-a-different-real-random-secret-32-chars-min',
        }),
      ).toThrow(/JWT_REFRESH_SECRET is still the placeholder value/);
    });

    it('aggregates multiple production-safety violations into one error', () => {
      const validateEnv = freshValidateEnv();
      try {
        validateEnv({ ...PROD_ENV, DATABASE_SSL: 'false', SWAGGER_ENABLED: 'true' });
        throw new Error('expected validateEnv to throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toMatch(/DATABASE_SSL must be true in production/);
        expect(message).toMatch(/SWAGGER_ENABLED must be false in production/);
      }
    });

    // Phase 10, Module 6 (Monitoring).
    it('rejects METRICS_ENABLED=true (the default) in production with no METRICS_TOKEN', () => {
      const validateEnv = freshValidateEnv();
      expect(() => validateEnv({ ...PROD_ENV, METRICS_TOKEN: undefined })).toThrow(
        /METRICS_TOKEN must be set in production/,
      );
    });

    it('accepts METRICS_ENABLED=true in production when METRICS_TOKEN is set', () => {
      const validateEnv = freshValidateEnv();
      expect(() =>
        validateEnv({ ...PROD_ENV, METRICS_ENABLED: 'true', METRICS_TOKEN: 'a-real-token' }),
      ).not.toThrow();
    });

    it('does not require METRICS_TOKEN in production when METRICS_ENABLED=false', () => {
      const validateEnv = freshValidateEnv();
      expect(() =>
        validateEnv({ ...PROD_ENV, METRICS_ENABLED: 'false', METRICS_TOKEN: undefined }),
      ).not.toThrow();
    });
  });
});
