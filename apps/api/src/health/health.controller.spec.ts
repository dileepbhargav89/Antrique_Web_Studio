import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

function createController(overrides: Partial<Record<keyof HealthService, jest.Mock>> = {}) {
  const healthService = {
    checkLiveness: jest.fn().mockReturnValue({ status: 'ok', timestamp: 'now' }),
    checkReadiness: jest
      .fn()
      .mockResolvedValue({ status: 'ok', timestamp: 'now', checks: { database: 'ok' } }),
    checkStartup: jest
      .fn()
      .mockResolvedValue({ status: 'ok', timestamp: 'now', checks: { database: 'ok' } }),
    ...overrides,
  } as unknown as HealthService;
  return new HealthController(healthService);
}

describe('HealthController', () => {
  it('live() returns the liveness result as-is', () => {
    const controller = createController();
    expect(controller.live()).toEqual({ status: 'ok', timestamp: 'now' });
  });

  it('ready() returns the readiness result when healthy', async () => {
    const controller = createController();
    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      timestamp: 'now',
      checks: { database: 'ok' },
    });
  });

  it('ready() throws ServiceUnavailableException carrying the result body when unhealthy', async () => {
    const errorResult = { status: 'error', timestamp: 'now', checks: { database: 'error' } };
    const controller = createController({
      checkReadiness: jest.fn().mockResolvedValue(errorResult),
    });

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await controller.ready().catch((error: ServiceUnavailableException) => {
      expect(error.getResponse()).toEqual(errorResult);
    });
  });

  it('startup() returns the startup result when healthy', async () => {
    const controller = createController();
    await expect(controller.startup()).resolves.toEqual({
      status: 'ok',
      timestamp: 'now',
      checks: { database: 'ok' },
    });
  });

  it('startup() throws ServiceUnavailableException when unhealthy', async () => {
    const controller = createController({
      checkStartup: jest
        .fn()
        .mockResolvedValue({ status: 'error', timestamp: 'now', checks: { database: 'error' } }),
    });

    await expect(controller.startup()).rejects.toThrow(ServiceUnavailableException);
  });
});
