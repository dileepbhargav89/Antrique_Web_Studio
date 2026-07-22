import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

// Nested DTO — only ever validated as part of CreateFabricDto.images (see
// that file's `@ValidateNested({ each: true })`), never its own request
// body — same reasoning as catalog's own create-product-image.dto.ts.
export class CreateFabricImageDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  altText?: string;
}
