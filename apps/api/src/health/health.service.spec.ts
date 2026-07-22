import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';

function createHealthService(isHealthy: boolean) {
  const prisma = { isHealthy: jest.fn().mockResolvedValue(isHealthy) } as unknown as PrismaService;
  return { service: new HealthService(prisma), prisma };
}

describe('HealthService', () => {
  it('checkLiveness() always returns ok without touching the database', () => {
    const { service, prisma } = createHealthService(true);

    const result = service.checkLiveness();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
    expect(prisma.isHealthy).not.toHaveBeenCalled();
  });

  it('checkReadiness() returns ok with checks.database=ok when the database is healthy', async () => {
    const { service } = createHealthService(true);

    const result = await service.checkReadiness();

    expect(result).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      checks: { database: 'ok' },
    });
  });

  it('checkReadiness() returns error with checks.database=error when the database is unhealthy', async () => {
    const { service } = createHealthService(false);

    const result = await service.checkReadiness();

    expect(result).toEqual({
      status: 'error',
      timestamp: expect.any(String),
      checks: { database: 'error' },
    });
  });

  it('checkStartup() returns ok when the database is healthy', async () => {
    const { service } = createHealthService(true);

    const result = await service.checkStartup();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'ok' });
  });

  it('checkStartup() returns error when the database is unhealthy', async () => {
    const { service } = createHealthService(false);

    const result = await service.checkStartup();

    expect(result.status).toBe('error');
    expect(result.checks).toEqual({ database: 'error' });
  });
});
