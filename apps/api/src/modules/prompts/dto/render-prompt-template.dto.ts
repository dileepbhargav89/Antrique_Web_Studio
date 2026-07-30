import { IsObject, IsOptional } from 'class-validator';

// Values are coerced to strings at render time (template.service.ts) —
// accepting any JSON-object shape here keeps this DTO simple; a caller
// passing a number/boolean variable value is a normal, expected case
// (e.g. a budget figure), not a validation error.
export class RenderPromptTemplateDto {
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
