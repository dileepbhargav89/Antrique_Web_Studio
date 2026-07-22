// Engineering polish pass (pre-Backend-v1.0-review) — "Generate openapi.json
// from the real Nest application bootstrap... Never manually maintain the
// file." Boots the actual `AppModule` (every real controller/DTO,
// discovered the same way `main.ts` discovers them — this is not a
// hand-maintained/synthetic document), applies the SAME routing topology
// and Swagger config `main.ts` uses (via `bootstrap/api-routing.ts` and
// `bootstrap/swagger-document.ts` — see both files' own header comments
// for why sharing them, not duplicating them, is what makes "the generated
// specification always matches the backend" true), writes the resulting
// OpenAPI document to `openapi.json`, and exits. Never calls `app.listen()`
// — no HTTP server needs to actually accept connections for this.
//
// Requires a reachable Postgres (env.validation.ts's `DATABASE_URL`) and
// every other required env var — `NestFactory.create()` runs every
// module's `onModuleInit()`, including `PrismaService`'s real `SELECT 1`
// connectivity check, the same as booting the real server. CI's
// `openapi-generation` job (.github/workflows/ci.yml) provides a throwaway
// Postgres service container and CI-only placeholder secrets for exactly
// this reason — see that job's own comment.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { appConfig } from '../src/config';
import { applyApiRouting } from '../src/bootstrap/api-routing';
import { buildSwaggerDocument } from '../src/bootstrap/swagger-document';

const OUTPUT_PATH = resolve(__dirname, '..', 'openapi.json');

async function generate(): Promise<void> {
  // `logger: false` — this is a one-shot CLI generation run, not a served
  // application; Nest's own startup banner (every mapped route, every
  // module's own boot log) is noise here, not signal.
  const app = await NestFactory.create(AppModule, { logger: false });

  applyApiRouting(app);

  const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const document = buildSwaggerDocument(app, appCfg.version);

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();

  // eslint-disable-next-line no-console
  console.log(`OpenAPI specification written to ${OUTPUT_PATH}`);
}

generate().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(
    'Failed to generate OpenAPI specification:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
