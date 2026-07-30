import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PromptCategory } from '../../../../generated/prisma/enums';
import { PROMPT_TEMPLATE_SORT_FIELDS } from '../constants/prompts.constant';

export class PromptTemplateListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PromptCategory)
  category?: PromptCategory;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(PROMPT_TEMPLATE_SORT_FIELDS)
  sortBy?: (typeof PROMPT_TEMPLATE_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
