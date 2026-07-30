import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromptTemplateRepository } from './repositories/prompt-template.repository';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { PromptTemplateListQueryDto } from './dto/prompt-template-list-query.dto';
import { PromptTemplateResponseDto } from './dto/prompt-template-response.dto';
import { PromptRenderResponseDto } from './dto/prompt-render-response.dto';
import { PromptTestResponseDto } from './dto/prompt-test-response.dto';
import { toPromptTemplateResponseDto } from './mappers/prompt-template.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PROMPT_VARIABLE_PATTERN } from './constants/prompts.constant';
import { AiService } from '../../ai';
import type { AiProvider } from '../../ai';
import { Prisma, PromptTemplate } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping — see
// modules/crm/client.service.ts's own header comment for the shared
// reasoning. render()/renderInternal() are pure string interpolation, no
// AI call — test() is the one method in this whole module with a real
// external side effect (a paid, network-latency AI completion), kept as
// its own explicit action rather than folded into render() so a client
// can preview a rendered prompt for free before spending on a real call.
@Injectable()
export class PromptTemplateService {
  constructor(
    private readonly promptTemplateRepository: PromptTemplateRepository,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreatePromptTemplateDto, tenantId: string): Promise<PromptTemplateResponseDto> {
    const existing = await this.promptTemplateRepository.findActiveByKey(dto.key, tenantId);
    if (existing) {
      throw new ConflictException(`A prompt template with key "${dto.key}" already exists`);
    }

    const template = await this.promptTemplateRepository.create({
      data: {
        tenantId,
        key: dto.key,
        category: dto.category,
        name: dto.name,
        description: dto.description,
        template: dto.template,
        variables: dto.variables,
      },
    });

    return toPromptTemplateResponseDto(template);
  }

  async findById(id: string, tenantId: string): Promise<PromptTemplateResponseDto> {
    const template = await this.findActiveOrThrow(id, tenantId);
    return toPromptTemplateResponseDto(template);
  }

  async list(
    query: PromptTemplateListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<PromptTemplateResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.PromptTemplateWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { key: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.promptTemplateRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toPromptTemplateResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdatePromptTemplateDto,
    tenantId: string,
  ): Promise<PromptTemplateResponseDto> {
    await this.findActiveOrThrow(id, tenantId);

    const updated = await this.promptTemplateRepository.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        template: dto.template,
        variables: dto.variables,
        isActive: dto.isActive,
      },
    });

    return toPromptTemplateResponseDto(updated);
  }

  async render(
    id: string,
    variables: Record<string, unknown> | undefined,
    tenantId: string,
  ): Promise<PromptRenderResponseDto> {
    const template = await this.findActiveOrThrow(id, tenantId);
    const renderedPrompt = this.interpolate(template, variables ?? {});
    return new PromptRenderResponseDto(renderedPrompt);
  }

  // Lookup by stable `key` rather than a fragile seeded UUID — the shape
  // every real feature consumer (ProposalGeneratorService, and Steps 4+
  // as they're built) should call, per Step 14's "avoid duplicated
  // prompt logic": look up the template by its known key, reuse this
  // module's own render path, never re-implement `{{variable}}`
  // interpolation in the feature module.
  async renderByKey(
    key: string,
    variables: Record<string, unknown> | undefined,
    tenantId: string,
  ): Promise<string> {
    const template = await this.promptTemplateRepository.findActiveByKey(key, tenantId);
    if (!template) {
      throw new NotFoundException(`Prompt template with key "${key}" not found`);
    }
    return this.interpolate(template, variables ?? {});
  }

  async test(
    id: string,
    variables: Record<string, unknown> | undefined,
    tenantId: string,
    options: { provider?: AiProvider; maxTokens?: number; temperature?: number } = {},
  ): Promise<PromptTestResponseDto> {
    const template = await this.findActiveOrThrow(id, tenantId);
    const renderedPrompt = this.interpolate(template, variables ?? {});

    const result = await this.aiService.complete(
      {
        messages: [{ role: 'user', content: renderedPrompt }],
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      },
      options.provider,
    );

    return new PromptTestResponseDto(
      renderedPrompt,
      result.provider,
      result.model,
      result.text,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
      result.stopReason,
    );
  }

  private async findActiveOrThrow(id: string, tenantId: string): Promise<PromptTemplate> {
    const template = await this.promptTemplateRepository.findActiveById(id, tenantId);
    if (!template) {
      throw new NotFoundException(`Prompt template ${id} not found`);
    }
    return template;
  }

  // Every `{{variable}}` the template declares must be supplied — a
  // missing one is a caller error (BadRequestException), not silently
  // rendered as an empty string or left as literal "{{var}}" text, which
  // would produce a broken prompt no one asked for.
  private interpolate(template: PromptTemplate, variables: Record<string, unknown>): string {
    const missing = template.variables.filter((name) => variables[name] === undefined);
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required variable(s): ${missing.join(', ')}`);
    }

    return template.template.replace(PROMPT_VARIABLE_PATTERN, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match,
    );
  }
}
