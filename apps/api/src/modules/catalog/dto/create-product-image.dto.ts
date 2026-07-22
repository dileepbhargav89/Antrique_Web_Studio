import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

// Nested DTO — same reasoning as create-product-variant.dto.ts. `url` is
// a plain string reference, not an upload — no file-upload/CDN
// integration exists this milestone (see schema.prisma's ProductImage
// comment).
export class CreateProductImageDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  altText?: string;
}
