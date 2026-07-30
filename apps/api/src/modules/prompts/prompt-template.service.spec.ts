import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PromptTemplateService } from './prompt-template.service';
import { PromptTemplateRepository } from './repositories/prompt-template.repository';
import { AiService } from '../../ai';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { PromptCategory } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createTemplateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'template-1',
    tenantId: TENANT_ID,
    key: 'client-email-v1',
    category: PromptCategory.CLIENT_EMAIL,
    name: 'Client Email Drafter',
    description: null,
    template: 'Draft an email to {{clientName}} about {{purpose}}.',
    variables: ['clientName', 'purpose'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    version: 1,
    ...overrides,
  };
}

function createService(
  overrides: {
    repository?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const repository = {
    findActiveById: jest.fn(async () => createTemplateRow()),
    findActiveByKey: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createTemplateRow()),
    update: jest.fn(async () => createTemplateRow()),
    ...overrides.repository,
  } as unknown as PromptTemplateRepository;

  const aiService = {
    complete: jest.fn(async () => ({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      text: 'Hello Acme, following up on onboarding.',
      inputTokens: 42,
      outputTokens: 12,
      latencyMs: 350,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  return new PromptTemplateService(repository, aiService);
}

describe('PromptTemplateService', () => {
  describe('create()', () => {
    it('rejects a duplicate key', async () => {
      const service = createService({
        repository: { findActiveByKey: jest.fn(async () => createTemplateRow()) },
      });
      const dto = Object.assign(new CreatePromptTemplateDto(), {
        key: 'client-email-v1',
        category: PromptCategory.CLIENT_EMAIL,
        name: 'Dup',
        template: 'x',
        variables: [],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });

    it('creates a template scoped to the given tenantId', async () => {
      const createFn = jest.fn(async () => createTemplateRow());
      const service = createService({ repository: { create: createFn } });
      const dto = Object.assign(new CreatePromptTemplateDto(), {
        key: 'client-email-v1',
        category: PromptCategory.CLIENT_EMAIL,
        name: 'Client Email Drafter',
        template: 'Draft an email to {{clientName}} about {{purpose}}.',
        variables: ['clientName', 'purpose'],
      });

      await service.create(dto, TENANT_ID);

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: TENANT_ID, key: 'client-email-v1' }),
      });
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the template does not exist', async () => {
      const service = createService({ repository: { findActiveById: jest.fn(async () => null) } });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('render()', () => {
    it('interpolates every declared variable', async () => {
      const service = createService();

      const result = await service.render(
        'template-1',
        { clientName: 'Acme', purpose: 'onboarding' },
        TENANT_ID,
      );

      expect(result.renderedPrompt).toBe('Draft an email to Acme about onboarding.');
    });

    it('throws BadRequestException when a declared variable is missing', async () => {
      const service = createService();

      await expect(service.render('template-1', { clientName: 'Acme' }, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('test()', () => {
    it('renders the template and calls AiService.complete() with the rendered text', async () => {
      const completeFn = jest.fn(async () => ({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        text: 'Hello Acme, following up on onboarding.',
        inputTokens: 42,
        outputTokens: 12,
        latencyMs: 350,
        stopReason: 'end_turn',
      }));
      const service = createService({ aiService: { complete: completeFn } });

      const result = await service.test(
        'template-1',
        { clientName: 'Acme', purpose: 'onboarding' },
        TENANT_ID,
      );

      expect(completeFn).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Draft an email to Acme about onboarding.' }],
        }),
        undefined,
      );
      expect(result.text).toBe('Hello Acme, following up on onboarding.');
      expect(result.renderedPrompt).toBe('Draft an email to Acme about onboarding.');
    });

    it('passes through an explicit provider override', async () => {
      const completeFn = jest.fn(async () => ({
        provider: 'openai',
        model: 'gpt-4o',
        text: 'ok',
        inputTokens: 1,
        outputTokens: 1,
        latencyMs: 10,
        stopReason: 'stop',
      }));
      const service = createService({ aiService: { complete: completeFn } });

      await service.test('template-1', { clientName: 'Acme', purpose: 'onboarding' }, TENANT_ID, {
        provider: 'openai',
      });

      expect(completeFn).toHaveBeenCalledWith(expect.anything(), 'openai');
    });
  });
});
