import { Test } from '@nestjs/testing';
import { PromptTemplateController } from './prompt-template.controller';
import { PromptTemplateService } from './prompt-template.service';
import { PromptTemplateRepository } from './repositories/prompt-template.repository';
import { AiService, AiProviderFactory } from '../../ai';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { PromptCategory } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createTemplateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'template-1',
    tenantId: TENANT.tenantId,
    key: 'client-email-v1',
    category: PromptCategory.CLIENT_EMAIL,
    name: 'Client Email Drafter',
    description: null,
    template: 'Draft an email to {{clientName}}.',
    variables: ['clientName'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

// Same reasoning as modules/projects/project.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (PromptTemplateController -> PromptTemplateService -> its two deps).
describe('PromptTemplateController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [PromptTemplateController],
      providers: [
        PromptTemplateService,
        {
          provide: PromptTemplateRepository,
          useValue: {
            findActiveById: jest.fn(async () => createTemplateRow()),
            findActiveByKey: jest.fn(async () => null),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async () => createTemplateRow()),
            update: jest.fn(async () => createTemplateRow()),
          },
        },
        {
          provide: AiService,
          useValue: {
            complete: jest.fn(async () => ({
              provider: 'anthropic',
              model: 'claude-sonnet-4-5',
              text: 'Hello Acme.',
              inputTokens: 10,
              outputTokens: 5,
              latencyMs: 200,
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

    return moduleRef.get(PromptTemplateController);
  }

  it('resolves PromptTemplateService via DI and delegates create()', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreatePromptTemplateDto(), {
      key: 'client-email-v1',
      category: PromptCategory.CLIENT_EMAIL,
      name: 'Client Email Drafter',
      template: 'Draft an email to {{clientName}}.',
      variables: ['clientName'],
    });

    const result = await controller.create(dto, TENANT);

    expect(result.key).toBe('client-email-v1');
  });

  it('delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates render() with pure interpolation', async () => {
    const controller = await createController();

    const result = await controller.render(
      'template-1',
      { variables: { clientName: 'Acme' } },
      TENANT,
    );

    expect(result.renderedPrompt).toBe('Draft an email to Acme.');
  });

  it('delegates test() through to AiService', async () => {
    const controller = await createController();

    const result = await controller.test(
      'template-1',
      { variables: { clientName: 'Acme' } },
      TENANT,
    );

    expect(result.text).toBe('Hello Acme.');
    expect(result.renderedPrompt).toBe('Draft an email to Acme.');
  });
});
