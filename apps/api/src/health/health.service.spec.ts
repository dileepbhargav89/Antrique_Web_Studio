import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';

function createHealthService(databaseHealthy: boolean, redisHealthy = true) {
  const prisma = {
    isHealthy: jest.fn().mockResolvedValue(databaseHealthy),
  } as unknown as PrismaService;
  const redis = {
    isHealthy: jest.fn().mockResolvedValue(redisHealthy),
  } as unknown as RedisService;
  return { service: new HealthService(prisma, redis), prisma, redis };
}

describe('HealthService', () => {
  it('checkLiveness() always returns ok without touching any dependency', () => {
    const { service, prisma, redis } = createHealthService(true);

    const result = service.checkLiveness();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
    expect(prisma.isHealthy).not.toHaveBeenCalled();
    expect(redis.isHealthy).not.toHaveBeenCalled();
  });

  it('checkReadiness() returns ok with checks.database=ok/checks.redis=ok when both are healthy', async () => {
    const { service } = createHealthService(true, true);

    const result = await service.checkReadiness();

    expect(result).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      checks: { database: 'ok', redis: 'ok' },
    });
  });

  it('checkReadiness() returns error when the database is unhealthy', async () => {
    const { service } = createHealthService(false, true);

    const result = await service.checkReadiness();

    expect(result).toEqual({
      status: 'error',
      timestamp: expect.any(String),
      checks: { database: 'error', redis: 'ok' },
    });
  });

  it('checkReadiness() returns error when Redis is unhealthy, even if the database is fine', async () => {
    const { service } = createHealthService(true, false);

    const result = await service.checkReadiness();

    expect(result).toEqual({
      status: 'error',
      timestamp: expect.any(String),
      checks: { database: 'ok', redis: 'error' },
    });
  });

  it('checkStartup() returns ok when both dependencies are healthy', async () => {
    const { service } = createHealthService(true, true);

    const result = await service.checkStartup();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('checkStartup() returns error when either dependency is unhealthy', async () => {
    const { service } = createHealthService(false, true);

    const result = await service.checkStartup();

    expect(result.status).toBe('error');
    expect(result.checks).toEqual({ database: 'error', redis: 'ok' });
  });
});
