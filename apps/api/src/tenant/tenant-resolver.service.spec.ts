import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { extractHostnameSlugCandidate, TenantResolver } from './tenant-resolver.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { CacheService } from '../cache/cache.service';
import { InMemoryCacheStore } from '../cache/in-memory-cache.store';
import { MetricsService } from '../metrics/metrics.service';

const ACTIVE_TENANT = {
  id: '00000000-0000-7000-8000-000000000001',
  name: 'Antrique Web Studio',
  slug: 'antrique',
};

function createFakeOrganizationRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveBySlug: jest.fn(async () => null),
    findActiveById: jest.fn(async () => null),
    ...overrides,
  } as unknown as OrganizationRepository;
}

// Phase 10, Module 8 (Caching) — a real, fresh-per-call `CacheService`,
// not a mock: its own local `Map` (see that class's own comment) makes
// it cheap and safe to construct fresh per test, and the caching tests
// below need the real get/set/TTL behavior.
function createResolver(
  organizationRepository: OrganizationRepository,
  {
    nodeEnv = 'development',
    defaultTenantId = ACTIVE_TENANT.id,
    cache = new CacheService(new InMemoryCacheStore(), new MetricsService()),
  } = {},
) {
  return new TenantResolver(
    organizationRepository,
    { nodeEnv } as never,
    { id: defaultTenantId } as never,
    cache,
  );
}

function createRequest(overrides: Partial<Request> = {}): Request {
  return { hostname: 'localhost', headers: {}, ...overrides } as unknown as Request;
}

describe('extractHostnameSlugCandidate()', () => {
  it('extracts the leftmost label of a 3+-label hostname', () => {
    expect(extractHostnameSlugCandidate('acme.antrique.app')).toBe('acme');
  });

  it('lowercases the candidate', () => {
    expect(extractHostnameSlugCandidate('ACME.antrique.app')).toBe('acme');
  });

  it('returns undefined for a bare apex domain (2 labels)', () => {
    expect(extractHostnameSlugCandidate('antrique.app')).toBeUndefined();
  });

  it('returns undefined for localhost (1 label)', () => {
    expect(extractHostnameSlugCandidate('localhost')).toBeUndefined();
  });

  it('returns undefined for an IPv4 address, even with 3+ dot-separated segments', () => {
    expect(extractHostnameSlugCandidate('127.0.0.1')).toBeUndefined();
  });

  it('returns undefined for an undefined hostname', () => {
    expect(extractHostnameSlugCandidate(undefined)).toBeUndefined();
  });
});

describe('TenantResolver', () => {
  describe('priority 1: hostname', () => {
    it('resolves via hostname when the candidate slug matches an active tenant', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveBySlug: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository);

      const result = await resolver.resolve(createRequest({ hostname: 'antrique.example.app' }));

      expect(result).toEqual({ ...ACTIVE_TENANT, source: 'hostname' });
      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledWith('antrique');
    });

    it('falls through to the next priority when the hostname candidate matches no active tenant', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveBySlug: jest.fn(async () => null),
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository);

      const result = await resolver.resolve(
        createRequest({
          hostname: 'unknown-tenant.example.app',
          headers: { 'x-tenant-id': ACTIVE_TENANT.id },
        }),
      );

      expect(result.source).toBe('header');
    });
  });

  describe('priority 2: X-Tenant-ID header', () => {
    it('resolves via the header when it matches an active tenant', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository);

      const result = await resolver.resolve(
        createRequest({ headers: { 'x-tenant-id': ACTIVE_TENANT.id } }),
      );

      expect(result).toEqual({ ...ACTIVE_TENANT, source: 'header' });
      expect(organizationRepository.findActiveById).toHaveBeenCalledWith(ACTIVE_TENANT.id);
    });

    it('ignores a blank header value', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository);

      const result = await resolver.resolve(createRequest({ headers: { 'x-tenant-id': '  ' } }));

      expect(result.source).toBe('default');
    });
  });

  describe('priority 3: DEFAULT_TENANT_ID fallback', () => {
    it('falls back to DEFAULT_TENANT_ID in development when nothing else resolves', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository, { nodeEnv: 'development' });

      const result = await resolver.resolve(createRequest());

      expect(result).toEqual({ ...ACTIVE_TENANT, source: 'default' });
    });

    it('does NOT fall back in production — throws BadRequestException instead', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const resolver = createResolver(organizationRepository, { nodeEnv: 'production' });

      await expect(resolver.resolve(createRequest())).rejects.toThrow(BadRequestException);
      expect(organizationRepository.findActiveById).not.toHaveBeenCalled();
    });

    it('does NOT fall back in test — throws BadRequestException instead', async () => {
      const organizationRepository = createFakeOrganizationRepository();
      const resolver = createResolver(organizationRepository, { nodeEnv: 'test' });

      await expect(resolver.resolve(createRequest())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException even in development if the configured default tenant is not active/found', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => null),
      });
      const resolver = createResolver(organizationRepository, { nodeEnv: 'development' });

      await expect(resolver.resolve(createRequest())).rejects.toThrow(BadRequestException);
    });
  });

  it('throws BadRequestException when nothing resolves at all', async () => {
    const organizationRepository = createFakeOrganizationRepository();
    const resolver = createResolver(organizationRepository, { nodeEnv: 'production' });

    await expect(resolver.resolve(createRequest({ hostname: 'localhost' }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('hostname takes priority over the header when both would resolve', async () => {
    const hostnameTenant = { id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a-slug' };
    const headerTenant = { id: 'tenant-b', name: 'Tenant B', slug: 'tenant-b-slug' };
    const organizationRepository = createFakeOrganizationRepository({
      findActiveBySlug: jest.fn(async () => hostnameTenant),
      findActiveById: jest.fn(async () => headerTenant),
    });
    const resolver = createResolver(organizationRepository);

    const result = await resolver.resolve(
      createRequest({
        hostname: 'tenant-a-slug.example.app',
        headers: { 'x-tenant-id': headerTenant.id },
      }),
    );

    expect(result.id).toBe(hostnameTenant.id);
    expect(organizationRepository.findActiveById).not.toHaveBeenCalled();
  });

  // Phase 10, Module 8 (Caching).
  describe('caching', () => {
    it('does not re-query the database for a second resolve() via the same hostname', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveBySlug: jest.fn(async () => ACTIVE_TENANT),
      });
      const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
      const resolver = createResolver(organizationRepository, { cache });
      const request = createRequest({ hostname: 'antrique.example.app' });

      await resolver.resolve(request);
      await resolver.resolve(request);

      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledTimes(1);
    });

    it('does not re-query for a second resolve() via the same X-Tenant-ID header', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
      const resolver = createResolver(organizationRepository, { cache });
      const request = createRequest({ headers: { 'x-tenant-id': ACTIVE_TENANT.id } });

      await resolver.resolve(request);
      await resolver.resolve(request);

      expect(organizationRepository.findActiveById).toHaveBeenCalledTimes(1);
    });

    it('keys hostname and header lookups independently — resolving one does not cache-hit the other', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveBySlug: jest.fn(async () => ACTIVE_TENANT),
        findActiveById: jest.fn(async () => ACTIVE_TENANT),
      });
      const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
      const resolver = createResolver(organizationRepository, { cache });

      await resolver.resolve(createRequest({ hostname: 'antrique.example.app' }));
      await resolver.resolve(createRequest({ headers: { 'x-tenant-id': ACTIVE_TENANT.id } }));

      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledTimes(1);
      expect(organizationRepository.findActiveById).toHaveBeenCalledTimes(1);
    });

    it('keys different hostname candidates independently', async () => {
      const organizationRepository = createFakeOrganizationRepository({
        findActiveBySlug: jest.fn(async () => ACTIVE_TENANT),
      });
      const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
      const resolver = createResolver(organizationRepository, { cache });

      await resolver.resolve(createRequest({ hostname: 'acme.example.app' }));
      await resolver.resolve(createRequest({ hostname: 'other.example.app' }));

      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledTimes(2);
      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledWith('acme');
      expect(organizationRepository.findActiveBySlug).toHaveBeenCalledWith('other');
    });
  });
});
