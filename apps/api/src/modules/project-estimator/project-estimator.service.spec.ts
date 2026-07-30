import { ProjectEstimatorService } from './project-estimator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService } from '../../ai';
import { EstimateProjectDto } from './dto/estimate-project.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const VALID_JSON_RESPONSE = JSON.stringify({
  estimatedHours: '120-160 hours',
  sprintCount: '4 sprints (2-week)',
  teamSize: '2 developers, 1 designer',
  budgetRange: '$15k-$25k',
  complexity: 'Medium',
  dependencies: ['Third-party payment gateway approval'],
  confidenceScore: 72,
});

function createService(
  overrides: {
    promptTemplateService?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const promptTemplateService = {
    renderByKey: jest.fn(async () => 'rendered prompt text'),
    ...overrides.promptTemplateService,
  } as unknown as PromptTemplateService;

  const aiService = {
    complete: jest.fn(async () => ({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      text: VALID_JSON_RESPONSE,
      inputTokens: 150,
      outputTokens: 90,
      latencyMs: 400,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  return new ProjectEstimatorService(promptTemplateService, aiService);
}

describe('ProjectEstimatorService', () => {
  describe('estimate()', () => {
    it('renders the template with the scope of work and parses a valid JSON response', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new EstimateProjectDto(), {
        scopeOfWork: 'Rebuild the checkout flow with a new payment gateway',
      });

      const result = await service.estimate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'project-estimation-v1',
        { scopeOfWork: 'Rebuild the checkout flow with a new payment gateway' },
        TENANT_ID,
      );
      expect(result.parsedSuccessfully).toBe(true);
      expect(result.estimatedHours).toBe('120-160 hours');
      expect(result.complexity).toBe('Medium');
      expect(result.confidenceScore).toBe(72);
      expect(result.dependencies).toEqual(['Third-party payment gateway approval']);
    });

    it('strips markdown code fences before parsing', async () => {
      const fenced = '```json\n' + VALID_JSON_RESPONSE + '\n```';
      const service = createService({
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
      const dto = Object.assign(new EstimateProjectDto(), { scopeOfWork: 'Build a landing page' });

      const result = await service.estimate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.sprintCount).toBe('4 sprints (2-week)');
    });

    it('falls back to rawText/parsedSuccessfully=false on unparseable output', async () => {
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: 'I need more information to provide an estimate.',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 50,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new EstimateProjectDto(), { scopeOfWork: 'Build a landing page' });

      const result = await service.estimate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(false);
      expect(result.rawText).toBe('I need more information to provide an estimate.');
      expect(result.confidenceScore).toBeNull();
      expect(result.dependencies).toEqual([]);
    });

    it('falls back to confidenceScore=null when the model returns a non-numeric value', async () => {
      const nonNumeric = JSON.stringify({
        estimatedHours: '40 hours',
        sprintCount: '1 sprint',
        teamSize: '1 developer',
        budgetRange: '$5k',
        complexity: 'Low',
        dependencies: [],
        confidenceScore: 'high',
      });
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: nonNumeric,
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 50,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new EstimateProjectDto(), { scopeOfWork: 'Build a landing page' });

      const result = await service.estimate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.confidenceScore).toBeNull();
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
      const dto = Object.assign(new EstimateProjectDto(), {
        scopeOfWork: 'Build a landing page',
        provider: 'openai',
        maxTokens: 500,
        temperature: 0.3,
      });

      await service.estimate(dto, TENANT_ID);

      expect(completeFn).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500, temperature: 0.3 }),
        'openai',
      );
    });
  });
});
