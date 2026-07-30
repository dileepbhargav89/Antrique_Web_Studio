import { Test } from '@nestjs/testing';
import { ContentAssistantController } from './content-assistant.controller';
import { ContentAssistantService } from './content-assistant.service';
import { ContentDraftRepository } from './repositories/content-draft.repository';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService, AiProviderFactory } from '../../ai';
import { GenerateContentDto } from './dto/generate-content.dto';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { ContentDraftType } from '../../../generated/prisma/enums';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };
const DRAFT_ID = '00000000-0000-7000-8000-000000000050';

function createDraftRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DRAFT_ID,
    tenantId: TENANT.tenantId,
    type: ContentDraftType.BLOG_DRAFT,
    title: 'A great blog post',
    body: 'Lorem ipsum...',
    brief: 'Write about the launch.',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

const VALID_JSON_RESPONSE = JSON.stringify({ title: 'A great blog post', body: 'Lorem ipsum...' });

// Same reasoning as prompt-template.controller.spec.ts — resolves through
// a real Nest TestingModule so DI wiring itself is verified
// (ContentAssistantController -> ContentAssistantService -> its 3 deps).
describe('ContentAssistantController', () => {
  async function createController(overrides: { repoOverrides?: Record<string, jest.Mock> } = {}) {
    const moduleRef = await Test.createTestingModule({
      controllers: [ContentAssistantController],
      providers: [
        ContentAssistantService,
        {
          provide: ContentDraftRepository,
          useValue: {
            findActiveById: jest.fn(async () => createDraftRow()),
            findManyPaginated: jest.fn(async () => ({ items: [createDraftRow()], total: 1 })),
            create: jest.fn(async () => createDraftRow()),
            update: jest.fn(async () => createDraftRow()),
            ...overrides.repoOverrides,
          },
        },
        {
          provide: PromptTemplateService,
          useValue: { renderByKey: jest.fn(async () => 'rendered') },
        },
        {
          provide: AiService,
          useValue: {
            complete: jest.fn(async () => ({
              provider: 'anthropic',
              model: 'claude-sonnet-4-5',
              text: VALID_JSON_RESPONSE,
              inputTokens: 20,
              outputTokens: 15,
              latencyMs: 300,
              stopReason: 'end_turn',
            })),
          },
        },
        { provide: AiProviderFactory, useValue: {} },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(ContentAssistantController);
  }

  it('resolves ContentAssistantService via DI and delegates generate()', async () => {
    const controller = await createController();
    const dto = Object.assign(new GenerateContentDto(), {
      type: ContentDraftType.BLOG_DRAFT,
      brief: 'Write about the launch.',
    });

    const result = await controller.generate(dto, TENANT);

    expect(result.title).toBe('A great blog post');
  });

  it('delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.total).toBe(1);
  });

  it('delegates findById()', async () => {
    const controller = await createController();

    const result = await controller.findById(DRAFT_ID, TENANT);

    expect(result.id).toBe(DRAFT_ID);
  });

  it('delegates update()', async () => {
    const update = jest.fn(async () => createDraftRow({ title: 'Edited' }));
    const controller = await createController({ repoOverrides: { update } });
    const dto = Object.assign(new UpdateContentDraftDto(), { title: 'Edited' });

    const result = await controller.update(DRAFT_ID, dto, TENANT);

    expect(result.title).toBe('Edited');
  });

  it('delegates remove()', async () => {
    const update = jest.fn(async () => createDraftRow());
    const controller = await createController({ repoOverrides: { update } });

    await controller.remove(DRAFT_ID, TENANT);

    expect(update).toHaveBeenCalledWith({
      where: { id: DRAFT_ID },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
