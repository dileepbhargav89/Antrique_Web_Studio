import { BadRequestException } from '@nestjs/common';
import { ProposalGeneratorService } from './proposal-generator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { AiService } from '../../ai';
import { GenerateProposalDto } from './dto/generate-proposal.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const VALID_JSON_RESPONSE = JSON.stringify({
  scope: 'Rebuild the marketing site.',
  deliverables: ['Homepage', 'Pricing page'],
  timeline: '6 weeks',
  pricingAssumptions: ['Fixed bid'],
  risks: ['Content delays'],
  exclusions: ['SEO copywriting'],
  technologyStack: ['Next.js', 'NestJS'],
});

function createService(
  overrides: {
    promptTemplateService?: Partial<Record<string, unknown>>;
    clientRepository?: Partial<Record<string, unknown>>;
    leadRepository?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const promptTemplateService = {
    renderByKey: jest.fn(async () => 'rendered prompt text'),
    ...overrides.promptTemplateService,
  } as unknown as PromptTemplateService;

  const clientRepository = {
    findActiveById: jest.fn(async () => ({ id: 'client-1', name: 'Acme Inc' })),
    ...overrides.clientRepository,
  } as unknown as ClientRepository;

  const leadRepository = {
    findActiveById: jest.fn(async () => ({
      id: 'lead-1',
      organization: 'Acme Inc',
      contactName: 'Jordan',
    })),
    ...overrides.leadRepository,
  } as unknown as LeadRepository;

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

  return new ProposalGeneratorService(
    promptTemplateService,
    clientRepository,
    leadRepository,
    aiService,
  );
}

describe('ProposalGeneratorService', () => {
  describe('generate()', () => {
    it('rejects when neither clientId nor leadId is provided', async () => {
      const service = createService();
      const dto = Object.assign(new GenerateProposalDto(), { requirements: 'Need a website' });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when both clientId and leadId are provided', async () => {
      const service = createService();
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'client-1',
        leadId: 'lead-1',
        requirements: 'Need a website',
      });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when the given clientId does not resolve to a real client', async () => {
      const service = createService({
        clientRepository: { findActiveById: jest.fn(async () => null) },
      });
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'missing',
        requirements: 'Need a website',
      });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('renders the template with the resolved client name and parses a valid JSON response', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'client-1',
        requirements: 'Rebuild the marketing site',
        budgetRange: '$10k-$20k',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'proposal-generation-v1',
        expect.objectContaining({
          clientName: 'Acme Inc',
          requirements: 'Rebuild the marketing site',
          budgetRange: '$10k-$20k',
        }),
        TENANT_ID,
      );
      expect(result.parsedSuccessfully).toBe(true);
      expect(result.scope).toBe('Rebuild the marketing site.');
      expect(result.deliverables).toEqual(['Homepage', 'Pricing page']);
    });

    it('falls back to the lead organization when resolving via leadId', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateProposalDto(), {
        leadId: 'lead-1',
        requirements: 'Need a website',
      });

      await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'proposal-generation-v1',
        expect.objectContaining({ clientName: 'Acme Inc' }),
        TENANT_ID,
      );
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
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'client-1',
        requirements: 'Need a website',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.timeline).toBe('6 weeks');
    });

    it('falls back to rawText/parsedSuccessfully=false on unparseable output', async () => {
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: 'Sorry, I cannot help with that.',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'client-1',
        requirements: 'Need a website',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(false);
      expect(result.rawText).toBe('Sorry, I cannot help with that.');
      expect(result.deliverables).toEqual([]);
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
      const dto = Object.assign(new GenerateProposalDto(), {
        clientId: 'client-1',
        requirements: 'Need a website',
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
});
