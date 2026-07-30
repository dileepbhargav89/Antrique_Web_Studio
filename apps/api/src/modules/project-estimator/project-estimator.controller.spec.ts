import { Test } from '@nestjs/testing';
import { ProjectEstimatorController } from './project-estimator.controller';
import { ProjectEstimatorService } from './project-estimator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService, AiProviderFactory } from '../../ai';
import { EstimateProjectDto } from './dto/estimate-project.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

const VALID_JSON_RESPONSE = JSON.stringify({
  estimatedHours: '40 hours',
  sprintCount: '1 sprint',
  teamSize: '1 developer',
  budgetRange: '$5k',
  complexity: 'Low',
  dependencies: [],
  confidenceScore: 80,
});

// Same reasoning as modules/proposal-generator/proposal-generator.controller.spec.ts.
describe('ProjectEstimatorController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectEstimatorController],
      providers: [
        ProjectEstimatorService,
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
      ],
    }).compile();

    return moduleRef.get(ProjectEstimatorController);
  }

  it('resolves ProjectEstimatorService via DI and delegates estimate()', async () => {
    const controller = await createController();
    const dto = Object.assign(new EstimateProjectDto(), { scopeOfWork: 'Build a landing page' });

    const result = await controller.estimate(dto, TENANT);

    expect(result.parsedSuccessfully).toBe(true);
    expect(result.confidenceScore).toBe(80);
  });
});
