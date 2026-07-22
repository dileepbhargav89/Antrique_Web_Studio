import { RuntimeService } from './runtime.service';
import { PrismaService } from '../../database/prisma.service';

function createService(databaseHealthy: boolean) {
  const config = { version: '1.2.3', gitCommitSha: 'abc1234', nodeEnv: 'production' } as never;
  const prisma = {
    isHealthy: jest.fn().mockResolvedValue(databaseHealthy),
  } as unknown as PrismaService;
  return new RuntimeService(config, prisma);
}

describe('RuntimeService', () => {
  it('returns config-sourced identity fields, uptime, a timestamp, and database=ok when healthy', async () => {
    const service = createService(true);

    const result = await service.getRuntimeInfo();

    expect(result.version).toBe('1.2.3');
    expect(result.gitCommitSha).toBe('abc1234');
    expect(result.nodeEnv).toBe('production');
    expect(result.database).toBe('ok');
    expect(typeof result.uptimeSeconds).toBe('number');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('returns database=error when the database is unhealthy', async () => {
    const service = createService(false);

    const result = await service.getRuntimeInfo();

    expect(result.database).toBe('error');
  });
});
