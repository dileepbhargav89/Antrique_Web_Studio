import { NotFoundException } from '@nestjs/common';
import { ContentAssistantService } from './content-assistant.service';
import { ContentDraftRepository } from './repositories/content-draft.repository';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService } from '../../ai';
import { GenerateContentDto } from './dto/generate-content.dto';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { ContentDraftType } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const DRAFT_ID = '00000000-0000-7000-8000-000000000050';

function createDraftRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DRAFT_ID,
    tenantId: TENANT_ID,
    type: ContentDraftType.BLOG_DRAFT,
    title: "How We Rebuilt Acme's Storefront",
    body: 'Lorem ipsum...',
    brief: 'Write about the Acme storefront relaunch.',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

const VALID_JSON_RESPONSE = JSON.stringify({
  title: "How We Rebuilt Acme's Storefront",
  body: 'Lorem ipsum...',
});

function createService(
  overrides: {
    contentDraftRepository?: Partial<Record<string, unknown>>;
    promptTemplateService?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const contentDraftRepository = {
    findActiveById: jest.fn(async () => createDraftRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createDraftRow()),
    update: jest.fn(async () => createDraftRow()),
    ...overrides.contentDraftRepository,
  } as unknown as ContentDraftRepository;

  const promptTemplateService = {
    renderByKey: jest.fn(async () => 'rendered prompt text'),
    ...overrides.promptTemplateService,
  } as unknown as PromptTemplateService;

  const aiService = {
    complete: jest.fn(async () => ({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      text: VALID_JSON_RESPONSE,
      inputTokens: 100,
      outputTokens: 80,
      latencyMs: 500,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  return new ContentAssistantService(contentDraftRepository, promptTemplateService, aiService);
}

describe('ContentAssistantService', () => {
  describe('generate()', () => {
    it('renders the template with a human-readable contentType label and the brief', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateContentDto(), {
        type: ContentDraftType.CASE_STUDY,
        brief: 'Write about the Kestrel marketing site launch.',
      });

      await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'content-generation-v1',
        { contentType: 'case study', brief: 'Write about the Kestrel marketing site launch.' },
        TENANT_ID,
      );
    });

    it('persists a real ContentDraft row on a clean JSON parse', async () => {
      const create = jest.fn(async (args: Record<string, unknown>) =>
        createDraftRow(args.data as object),
      );
      const service = createService({ contentDraftRepository: { create } });
      const dto = Object.assign(new GenerateContentDto(), {
        type: ContentDraftType.BLOG_DRAFT,
        brief: 'Write about the Acme storefront relaunch.',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          type: ContentDraftType.BLOG_DRAFT,
          title: "How We Rebuilt Acme's Storefront",
          body: 'Lorem ipsum...',
          brief: 'Write about the Acme storefront relaunch.',
        },
      });
      expect(result.title).toBe("How We Rebuilt Acme's Storefront");
    });

    it('strips markdown code fences before parsing', async () => {
      const fenced = '```json\n' + VALID_JSON_RESPONSE + '\n```';
      const create = jest.fn(async (args: Record<string, unknown>) =>
        createDraftRow(args.data as object),
      );
      const service = createService({
        contentDraftRepository: { create },
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: fenced,
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateContentDto(), {
        type: ContentDraftType.BLOG_DRAFT,
        brief: 'Write about the Acme storefront relaunch.',
      });

      await service.generate(dto, TENANT_ID);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ body: 'Lorem ipsum...' }) }),
      );
    });

    it('still persists a draft — falling back to a generic title and the raw text as body — on unparseable output', async () => {
      const create = jest.fn(async (args: Record<string, unknown>) =>
        createDraftRow(args.data as object),
      );
      const service = createService({
        contentDraftRepository: { create },
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: 'Sure, here is a blog post about your storefront relaunch...',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateContentDto(), {
        type: ContentDraftType.BLOG_DRAFT,
        brief: 'Write about the Acme storefront relaunch.',
      });

      await service.generate(dto, TENANT_ID);

      expect(create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          type: ContentDraftType.BLOG_DRAFT,
          title: 'Untitled blog post draft',
          body: 'Sure, here is a blog post about your storefront relaunch...',
          brief: 'Write about the Acme storefront relaunch.',
        },
      });
    });

    it('passes provider/maxTokens/temperature overrides through to AiService', async () => {
      const completeFn = jest.fn(async () => ({
        provider: 'openai',
        model: 'gpt-4o',
        text: VALID_JSON_RESPONSE,
        inputTokens: 1,
        outputTokens: 1,
        latencyMs: 10,
        stopReason: 'stop',
      }));
      const service = createService({ aiService: { complete: completeFn } });
      const dto = Object.assign(new GenerateContentDto(), {
        type: ContentDraftType.SOCIAL_POST,
        brief: 'Announce the new office opening.',
        provider: 'openai',
        maxTokens: 500,
        temperature: 0.5,
      });

      await service.generate(dto, TENANT_ID);

      expect(completeFn).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500, temperature: 0.5 }),
        'openai',
      );
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when no active draft matches', async () => {
      const service = createService({
        contentDraftRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.findById(DRAFT_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns the mapped draft when found', async () => {
      const service = createService();

      const result = await service.findById(DRAFT_ID, TENANT_ID);

      expect(result.id).toBe(DRAFT_ID);
    });
  });

  describe('list()', () => {
    it('filters by type when provided', async () => {
      const findManyPaginated = jest.fn(async () => ({ items: [], total: 0 }));
      const service = createService({ contentDraftRepository: { findManyPaginated } });

      await service.list({ type: ContentDraftType.FAQ } as never, TENANT_ID);

      expect(findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        { type: ContentDraftType.FAQ },
        { createdAt: 'desc' },
        0,
        20,
      );
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when no active draft matches', async () => {
      const service = createService({
        contentDraftRepository: { findActiveById: jest.fn(async () => null) },
      });
      const dto = Object.assign(new UpdateContentDraftDto(), { title: 'New title' });

      await expect(service.update(DRAFT_ID, dto, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('updates title/body via the repository, no AI call', async () => {
      const update = jest.fn(async () => createDraftRow({ title: 'Edited title' }));
      const service = createService({ contentDraftRepository: { update } });
      const dto = Object.assign(new UpdateContentDraftDto(), { title: 'Edited title' });

      const result = await service.update(DRAFT_ID, dto, TENANT_ID);

      expect(update).toHaveBeenCalledWith({
        where: { id: DRAFT_ID },
        data: { title: 'Edited title', body: undefined },
      });
      expect(result.title).toBe('Edited title');
    });
  });

  describe('remove()', () => {
    it('throws NotFoundException when no active draft matches', async () => {
      const service = createService({
        contentDraftRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.remove(DRAFT_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes via deletedAt, never a real DELETE', async () => {
      const update = jest.fn(async () => createDraftRow());
      const service = createService({ contentDraftRepository: { update } });

      await service.remove(DRAFT_ID, TENANT_ID);

      expect(update).toHaveBeenCalledWith({
        where: { id: DRAFT_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
