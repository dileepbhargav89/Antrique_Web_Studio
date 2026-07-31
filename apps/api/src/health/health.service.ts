import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';
import { HealthCheckResult } from './types/health-check-result.type';

// Milestone 14 (Production Infrastructure) — the real implementation this
// directory's own README named as future work ("Liveness/readiness
// endpoints... land here once those dependencies exist to check" — the
// dependency, PrismaService.isHealthy(), has existed since Milestone 12's
// own health-check-shaped method with "no current caller yet," the same
// build-before-first-consumer pattern this codebase keeps repeating).
//
// Three checks, not one, because they answer three different operational
// questions a deployment's own orchestrator (Kubernetes, a managed
// container platform) asks at different times and with different
// consequences for a wrong answer:
//   - liveness:  "is this process still alive and able to respond at
//                 all?" No dependency check — a downstream DB outage must
//                 NOT fail liveness, or an orchestrator would kill and
//                 restart every pod in a cascading failure that doesn't
//                 fix the actual (external) problem.
//   - readiness: "should traffic be routed to this instance right now?"
//                 Checks every real dependency (database, and — since
//                 Phase 10, Module 8's Redis-backed cache — Redis too) on
//                 every call — an instance that can't reach either should
//                 stop receiving requests until it can, without being
//                 killed (it may recover on its own).
//   - startup:   "has this instance finished initializing at least once?"
//                 Same underlying check as readiness in this app's own
//                 lifecycle (there is no separate multi-step warm-up
//                 sequence beyond PrismaService/RedisService's own
//                 fail-fast onModuleInit() connection checks, which
//                 already run to completion before app.listen() ever
//                 resolves) — kept as its own method/endpoint anyway
//                 because a real deployment configures it with different
//                 probe cadence/failure-threshold than readiness (checked
//                 less frequently, only gates the OTHER two probes during
//                 initial pod boot), not because the check itself needs
//                 to differ today.
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  checkLiveness(): HealthCheckResult {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    return this.checkDependencies();
  }

  async checkStartup(): Promise<HealthCheckResult> {
    return this.checkDependencies();
  }

  private async checkDependencies(): Promise<HealthCheckResult> {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
    ]);
    const healthy = databaseHealthy && redisHealthy;
    return {
      status: healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseHealthy ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error',
      },
    };
  }
}
