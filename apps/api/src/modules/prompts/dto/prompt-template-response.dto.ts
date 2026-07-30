import { PromptCategory } from '../../../../generated/prisma/enums';

export class PromptTemplateResponseDto {
  constructor(
    readonly id: string,
    readonly key: string,
    readonly category: PromptCategory,
    readonly name: string,
    readonly description: string | null,
    readonly template: string,
    readonly variables: string[],
    readonly isActive: boolean,
    readonly version: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
