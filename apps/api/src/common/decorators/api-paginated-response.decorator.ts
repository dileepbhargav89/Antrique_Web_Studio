import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

// Phase 4 (Frontend Readiness Review) — `PaginatedResponseDto<T>` is a
// generic wrapper class with no class-validator/`@ApiProperty` decorators
// of its own (it's a plain constructor, built once in Milestone 5 and
// reused wholesale ever since), so `@nestjs/swagger`'s reflection-based
// schema generation has nothing to introspect for it — every list
// endpoint's 200 response was completely undocumented in the generated
// OpenAPI spec before this decorator existed, confirmed empirically (zero
// `PaginatedResponseDto` entries anywhere in `components.schemas`,
// regardless of endpoint). This is Nest's own documented pattern for a
// generic response wrapper (`ApiExtraModels` + `allOf` composition,
// swagger.io/docs "Generics and interfaces") — one reusable helper here
// rather than repeating the same `allOf` composition at ~20 individual
// list-endpoint call sites. Pure additive Swagger metadata: does not
// touch `PaginatedResponseDto` itself, any DTO, any route, or any
// response's actual runtime shape.
export function ApiPaginatedResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
}
