import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// `type`/`brief` are immutable after create — `brief` is the input that
// produced this draft, not something a human edits after the fact (if the
// brief was wrong, generate a new draft). `title`/`body` are the actual
// output a human reviews and refines before copying it elsewhere.
export class UpdateContentDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body?: string;
}
