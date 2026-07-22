import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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
//                 Checks the one real dependency (the database) on every
//                 call — a instance that can't reach its database should
//                 stop receiving requests until it can, without being
//                 killed (it may recover on its own).
//   - startup:   "has this instance finished initializing at least once?"
//                 Same underlying check as readiness in this app's own
//                 lifecycle (there is no separate multi-step warm-up
//                 sequence beyond PrismaService.onModuleInit()'s own
//                 fail-fast connection check, which already runs to
//                 completion before app.listen() ever resolves — see
//                 prisma.service.ts) — kept as its own method/endpoint
//                 anyway because a real deployment configures it with
//                 different probe cadence/failure-threshold than
//                 readiness (checked less frequently, only gates the
//                 OTHER two probes during initial pod boot), not because
//                 the check itself needs to differ today.
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  checkLiveness(): HealthCheckResult {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    const databaseHealthy = await this.prisma.isHealthy();
    return {
      status: databaseHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: { database: databaseHealthy ? 'ok' : 'error' },
    };
  }

  async checkStartup(): Promise<HealthCheckResult> {
    const databaseHealthy = await this.prisma.isHealthy();
    return {
      status: databaseHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: { database: databaseHealthy ? 'ok' : 'error' },
    };
  }
}
