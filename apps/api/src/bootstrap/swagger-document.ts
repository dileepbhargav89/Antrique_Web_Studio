import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

// Engineering polish pass (pre-Backend-v1.0-review) — extracted verbatim
// out of main.ts's own inline DocumentBuilder call so it has exactly ONE
// definition, shared by:
//   - main.ts (mounts it at SWAGGER_PATH via SwaggerModule.setup(), gated
//     behind swaggerCfg.enabled — the live, served copy)
//   - scripts/generate-openapi.ts (writes it to openapi.json — the CI
//     artifact, generated unconditionally regardless of SWAGGER_ENABLED,
//     since it's a build-time document, not a runtime-served endpoint)
// "Do not duplicate Swagger configuration" (this task's own explicit
// instruction) is what this file exists to satisfy — title/description/
// bearer-auth scheme are defined once, here.
export function buildSwaggerDocument(app: INestApplication, version: string): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Antrique API')
      .setDescription(
        'Antrique Web Studio backend — modular-monolith REST API. Every protected route ' +
          'requires a Bearer access token (see POST /auth/login). Validation errors return ' +
          '400 with a NestJS ValidationPipe-shaped body — `{ statusCode: 400, message: string[], ' +
          "error: 'Bad Request' }`, where each entry in `message` is a human-readable sentence " +
          '(e.g. "email must be an email") rather than a structured { field, reason } pair; ' +
          'authentication failures return 401; authorization failures return 403 — never the ' +
          'reverse (see docs/architecture/security.md). Success-response schemas below name the ' +
          'correct DTO/array/pagination shape for every endpoint, but individual response fields ' +
          "are not itemized in this document (see each DTO's own source under src/modules/*/dto/ " +
          'for the authoritative field list) — request DTOs above are fully itemized.',
      )
      .setVersion(version)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build(),
  );
}
