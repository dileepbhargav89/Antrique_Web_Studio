import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentDraftRepository } from './repositories/content-draft.repository';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService } from '../../ai';
import { GenerateContentDto } from './dto/generate-content.dto';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { ContentDraftListQueryDto } from './dto/content-draft-list-query.dto';
import { ContentDraftResponseDto } from './dto/content-draft-response.dto';
import { toContentDraftResponseDto } from './mappers/content-draft.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import {
  CONTENT_GENERATION_TEMPLATE_KEY,
  CONTENT_TYPE_LABELS,
} from './constants/content-assistant.constant';
import { ContentDraft, Prisma } from '../../../generated/prisma/client';

// Step 7 (Content Assistant) — the one Phase 8 generation feature whose
// own spec explicitly persists output ("Store drafts only. Never publish
// automatically."), unlike Steps 3-5's "writes nothing" shape or Step 6's
// own generate() half. `generate()` here always creates a real
// `ContentDraft` row, even when the model's response fails to parse as
// the expected {title, body} JSON — see `parseGeneratedContent()`'s own
// comment for why a bad parse still gets *something* useful stored,
// rather than silently discarding a real, paid AI call's output.
@Injectable()
export class ContentAssistantService {
  constructor(
    private readonly contentDraftRepository: ContentDraftRepository,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly aiService: AiService,
  ) {}

  async generate(dto: GenerateContentDto, tenantId: string): Promise<ContentDraftResponseDto> {
    const contentType = CONTENT_TYPE_LABELS[dto.type];

    const renderedPrompt = await this.promptTemplateService.renderByKey(
      CONTENT_GENERATION_TEMPLATE_KEY,
      { contentType, brief: dto.brief },
      tenantId,
    );

    const result = await this.aiService.complete(
      {
        messages: [{ role: 'user', content: renderedPrompt }],
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
      },
      dto.provider,
    );

    const { title, body } = this.parseGeneratedContent(result.text, contentType);

    const draft = await this.contentDraftRepository.create({
      data: {
        tenantId,
        type: dto.type,
        title,
        body,
        brief: dto.brief,
      },
    });

    return toContentDraftResponseDto(draft);
  }

  async findById(id: string, tenantId: string): Promise<ContentDraftResponseDto> {
    const draft = await this.findActiveOrThrow(id, tenantId);
    return toContentDraftResponseDto(draft);
  }

  async list(
    query: ContentDraftListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ContentDraftResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ContentDraftWhereInput = {
      ...(query.type ? { type: query.type } : {}),
    };

    const { items, total } = await this.contentDraftRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toContentDraftResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateContentDraftDto,
    tenantId: string,
  ): Promise<ContentDraftResponseDto> {
    await this.findActiveOrThrow(id, tenantId);

    const updated = await this.contentDraftRepository.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
      },
    });

    return toContentDraftResponseDto(updated);
  }

  // Discard only — never publishes anywhere, this app has no
  // content-publish pipeline for a draft to graduate into (see the
  // schema's own ContentDraftType comment). Soft-delete only, same
  // "never hard-delete" treatment CustomerNote already follows.
  async remove(id: string, tenantId: string): Promise<void> {
    await this.findActiveOrThrow(id, tenantId);
    await this.contentDraftRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findActiveOrThrow(id: string, tenantId: string): Promise<ContentDraft> {
    const draft = await this.contentDraftRepository.findActiveById(id, tenantId);
    if (!draft) {
      throw new NotFoundException(`Content draft ${id} not found`);
    }
    return draft;
  }

  // Unlike every other Phase 8 parser (which fails closed to `null` and
  // returns nothing on a bad parse), this one always returns something —
  // Step 7's own spec requires *storing* the draft no matter what, and a
  // paid AI call that produced real prose just in the wrong envelope
  // shouldn't be thrown away. On a clean {title, body} JSON parse, use it
  // as-is; otherwise fall back to a generic title and the model's raw
  // text as the body, so the human reviewing drafts still gets the actual
  // generated content to work with.
  private parseGeneratedContent(
    text: string,
    contentType: string,
  ): { title: string; body: string } {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      if (typeof data.title === 'string' && typeof data.body === 'string') {
        return { title: data.title, body: data.body };
      }
    } catch {
      // fall through to the raw-text fallback below
    }
    return { title: `Untitled ${contentType}`, body: text };
  }
}
