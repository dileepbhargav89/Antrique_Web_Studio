import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// `key`/`category` are immutable after create — same "identity fields
// don't change on update" treatment every slug-keyed entity in this
// codebase follows (CustomerTag's slug, LeadSource's slug). `isActive` IS
// here (unlike CreateClientDto's own status omission): deactivating a
// template is this entity's only "delete"-shaped mutation (no
// `prompt_templates:delete` permission is seeded — soft-deactivate via
// this field, not a real delete route).
export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  template?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
