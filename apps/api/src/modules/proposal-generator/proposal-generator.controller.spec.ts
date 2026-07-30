import { Test } from '@nestjs/testing';
import { ProposalGeneratorController } from './proposal-generator.controller';
import { ProposalGeneratorService } from './proposal-generator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { AiService, AiProviderFactory } from '../../ai';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

const VALID_JSON_RESPONSE = JSON.stringify({
  scope: 'Rebuild the site.',
  deliverables: ['Homepage'],
  timeline: '4 weeks',
  pricingAssumptions: [],
  risks: [],
  exclusions: [],
  technologyStack: [],
});

// Same reasoning as modules/prompts/prompt-template.controller.spec.ts —
// resolves through a real Nest TestingModule so DI wiring itself is
// verified (ProposalGeneratorController -> ProposalGeneratorService ->
// its four deps, across two imported modules' worth of providers).
describe('ProposalGeneratorController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProposalGeneratorController],
      providers: [
        ProposalGeneratorService,
        {
          provide: PromptTemplateService,
          useValue: { renderByKey: jest.fn(async () => 'rendered') },
        },
        {
          provide: ClientRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'client-1', name: 'Acme Inc' })) },
        },
        { provide: LeadRepository, useValue: { findActiveById: jest.fn(async () => null) } },
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

    return moduleRef.get(ProposalGeneratorController);
  }

  it('resolves ProposalGeneratorService via DI and delegates generate()', async () => {
    const controller = await createController();
    const dto = Object.assign(new GenerateProposalDto(), {
      clientId: 'client-1',
      requirements: 'Rebuild the marketing site',
    });

    const result = await controller.generate(dto, TENANT);

    expect(result.parsedSuccessfully).toBe(true);
    expect(result.scope).toBe('Rebuild the site.');
  });
});
