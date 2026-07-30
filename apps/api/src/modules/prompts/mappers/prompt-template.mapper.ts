import { PromptTemplate } from '../../../../generated/prisma/client';
import { PromptTemplateResponseDto } from '../dto/prompt-template-response.dto';

export function toPromptTemplateResponseDto(template: PromptTemplate): PromptTemplateResponseDto {
  return new PromptTemplateResponseDto(
    template.id,
    template.key,
    template.category,
    template.name,
    template.description,
    template.template,
    template.variables,
    template.isActive,
    template.version,
    template.createdAt,
    template.updatedAt,
  );
}
