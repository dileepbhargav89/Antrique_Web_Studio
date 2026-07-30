import { INestApplication, RequestMethod, VersioningType } from '@nestjs/common';

// Engineering polish pass (pre-Backend-v1.0-review) — extracted verbatim
// out of main.ts's own bootstrap() so the standalone OpenAPI-generation
// script (scripts/generate-openapi.ts) can apply the EXACT SAME prefix/
// versioning topology the real server uses, without hand-copying it a
// second time. "Ensure generated specification always matches the
// backend" is only true if both call sites share one source — a
// generator that reimplements this independently would silently drift
// the moment main.ts's own routing changes.
const API_GLOBAL_PREFIX = 'api';

// `exclude` (Milestone 14) keeps HealthController's routes at a stable,
// unprefixed path (`/health/live`, not `/api/v1/health/live`) — see
// health/health.controller.ts's own comment for why. `metrics` (Phase 10,
// Module 6) gets the same treatment — `/metrics` is the de facto standard
// scrape path every Prometheus setup expects by convention; a real
// deployment's scrape config shouldn't need updating on every API version
// bump any more than a load balancer's health-check path should.
export function applyApiRouting(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [
      { path: 'health/(.*)', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
