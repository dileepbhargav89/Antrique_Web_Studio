import { IsHexColor, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/crm.constant';

export class CreateCustomerTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  slug!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
