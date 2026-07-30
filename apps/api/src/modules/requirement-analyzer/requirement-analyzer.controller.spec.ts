import { Test } from '@nestjs/testing';
import { RequirementAnalyzerController } from './requirement-analyzer.controller';
import { RequirementAnalyzerService } from './requirement-analyzer.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { DocumentTextExtractor } from './document-text-extractor';
import { AiService, AiProviderFactory } from '../../ai';
import { StorageService } from '../../storage';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

const VALID_JSON_RESPONSE = JSON.stringify({
  features: ['Login'],
  modules: ['Auth'],
  risks: [],
  timelineEstimate: '4 weeks',
  questions: [],
});

// Same reasoning as modules/proposal-generator/proposal-generator.controller.spec.ts.
describe('RequirementAnalyzerController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [RequirementAnalyzerController],
      providers: [
        RequirementAnalyzerService,
        {
          provide: PromptTemplateService,
          useValue: { renderByKey: jest.fn(async () => 'rendered') },
        },
        {
          provide: DocumentTextExtractor,
          useValue: { extract: jest.fn(async () => 'extracted text') },
        },
        {
          provide: StorageService,
          useValue: { upload: jest.fn(async () => 'https://storage.example.com/x.txt') },
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

    return moduleRef.get(RequirementAnalyzerController);
  }

  it('resolves RequirementAnalyzerService via DI and delegates analyze()', async () => {
    const controller = await createController();
    const file = {
      buffer: Buffer.from('hello'),
      mimetype: 'text/plain',
      originalname: 'brief.txt',
    } as Express.Multer.File;

    const result = await controller.analyze(file, TENANT);

    expect(result.parsedSuccessfully).toBe(true);
    expect(result.features).toEqual(['Login']);
    expect(result.documentUrl).toBe('https://storage.example.com/x.txt');
  });
});
