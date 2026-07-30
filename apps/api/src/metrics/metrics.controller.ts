import {
  Controller,
  Get,
  Inject,
  Req,
  Res,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import monitoringConfig from '../config/monitoring/monitoring.config';
import { MetricsService } from './metrics.service';
import { METRICS_AUTH_HEADER, METRICS_BEARER_PREFIX } from './metrics.constant';

// Phase 10, Module 6 (Monitoring) — `GET /metrics`, Prometheus exposition
// format. `@ApiExcludeController()` — this is an infrastructure/ops
// surface consumed by a scrape tool, not an API-consumer-facing route;
// documenting it in Swagger alongside real business endpoints would be
// noise for that audience, the same reasoning `HealthController` would
// arguably also justify but predates this convention.
//
// `version: VERSION_NEUTRAL` + `bootstrap/api-routing.ts`'s own
// `setGlobalPrefix(..., { exclude: [...] })` keep this at a stable,
// unprefixed `/metrics` — the de facto standard scrape path, same
// reasoning as `HealthController`'s own `/health/*` treatment.
//
// `@SkipThrottle()` — a Prometheus server scrapes on a fixed, short
// interval (commonly 15s) from one source; Milestone 13's global
// ThrottlerGuard would otherwise eventually rate-limit exactly that
// traffic pattern, the same reasoning `HealthController` already
// documents for orchestrator polling.
//
// No `JwtAuthGuard`/`PermissionsGuard` — this isn't a tenant- or
// user-scoped resource a human logs into; it's an infrastructure
// credential (`METRICS_TOKEN`) checked inline below, the same "guard
// concern, but not THE guard used for authenticated users" shape
// Prometheus's own `bearer_token` scrape-config option expects. Kept as
// a plain conditional rather than a dedicated `MetricsAuthGuard` class —
// there is exactly one route here; a guard abstraction for a single call
// site would be the class-per-concept default many of this codebase's own
// other modules choose deliberately AGAINST for exactly this reason (see
// `domain-module-guide.md`).
@ApiExcludeController()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
@SkipThrottle()
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    @Inject(monitoringConfig.KEY)
    private readonly config: ConfigType<typeof monitoringConfig>,
  ) {}

  @Get()
  async scrape(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<string> {
    this.assertAuthorized(req);
    res.header('Content-Type', this.metricsService.getContentType());
    return this.metricsService.getMetrics();
  }

  // Unset `metricsToken` (env.validation.ts's own superRefine enforces
  // this can only happen outside production — see that file's Phase 10,
  // Module 6 check) means no auth is required, matching this being the
  // dev-convenience default `METRICS_ENABLED=true` with no
  // `METRICS_TOKEN` set in `.env.example` already implies. A configured
  // token requires an exact `Authorization: Bearer <token>` match — no
  // partial/prefix matching, no timing-safe comparison (unlike a
  // password hash, this token has no legitimate reason to ever be
  // guessed byte-by-byte via response timing at any realistic request
  // volume; a plain `===` is the same treatment this codebase's other
  // shared-secret checks get where timing attacks aren't the credible
  // threat model — see `PLACEHOLDER_JWT_SECRETS` in `env.validation.ts`
  // for a comparable "no HMAC-timing-safe-equal needed here" precedent).
  private assertAuthorized(req: Request): void {
    const token = this.config.metricsToken;
    if (!token) {
      return;
    }

    const header = req.headers[METRICS_AUTH_HEADER];
    const presented = typeof header === 'string' ? header : undefined;
    if (presented !== `${METRICS_BEARER_PREFIX}${token}`) {
      throw new UnauthorizedException();
    }
  }
}
