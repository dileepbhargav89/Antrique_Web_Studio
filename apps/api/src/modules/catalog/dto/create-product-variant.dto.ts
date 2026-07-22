import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

// Nested DTO — only ever validated as part of CreateProductDto.variants
// (see that file's `@ValidateNested({ each: true })`), never its own
// request body: no standalone ProductVariant controller/repository
// exists this milestone (see product.repository.ts's own comment).
export class CreateProductVariantDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  // Plain stored value — no pricing engine, this milestone's own scope
  // boundary (see schema.prisma's ProductVariant comment).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
