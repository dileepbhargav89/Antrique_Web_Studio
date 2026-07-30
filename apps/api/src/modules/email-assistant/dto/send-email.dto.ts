import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// The reviewed/edited output of `POST /generate` resubmitted directly —
// same "human reviews, then resubmits exactly what they want kept" shape
// Task Generator's own `ApprovedTaskDto` uses; no reference back to a
// stored draft since Step 8 persists nothing (see EmailDraftResponseDto's
// own comment).
export class SendEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;
}
