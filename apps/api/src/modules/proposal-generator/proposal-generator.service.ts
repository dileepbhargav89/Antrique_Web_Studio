import { BadRequestException, Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { AiService } from '../../ai';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { ProposalDraftResponseDto } from './dto/proposal-draft-response.dto';
import { PROPOSAL_GENERATION_TEMPLATE_KEY } from './constants/proposal-generator.constant';

interface ParsedProposalSections {
  scope: string;
  deliverables: string[];
  timeline: string;
  pricingAssumptions: string[];
  risks: string[];
  exclusions: string[];
  technologyStack: string[];
}

// Step 3 (Proposal Generator) — deliberately writes NOTHING to the
// database. "Allow human editing before sending" (this step's own brief)
// means the output is a draft a person reviews and copies into a real
// Quotation through the EXISTING create-quotation flow
// (QuotationController, unchanged) — this module never creates a
// Quotation/QuotationItem row itself. Two reasons, both from the Phase 8
// brief directly: "AI should assist—not replace—human workflows," and
// pricing/line-items are a financial commitment this codebase already
// treats carefully (Quotation's own totals are server-computed, never
// AI-guessed) — auto-creating billable QuotationItems from an LLM's
// pricing assumptions would cross from "assist" into "replace."
//
// Reuses PromptTemplateService.renderByKey() (Step 2) for the actual
// prompt text — this module owns none of the prompt content itself, only
// the orchestration (resolve client/lead → render → call AI → parse),
// per Step 14's "clear separation between Prompts and Business
// workflows."
@Injectable()
export class ProposalGeneratorService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly clientRepository: ClientRepository,
    private readonly leadRepository: LeadRepository,
    private readonly aiService: AiService,
  ) {}

  async generate(dto: GenerateProposalDto, tenantId: string): Promise<ProposalDraftResponseDto> {
    if (Boolean(dto.clientId) === Boolean(dto.leadId)) {
      throw new BadRequestException('Exactly one of clientId or leadId must be provided');
    }

    const clientName = await this.resolveSubjectName(dto, tenantId);

    const renderedPrompt = await this.promptTemplateService.renderByKey(
      PROPOSAL_GENERATION_TEMPLATE_KEY,
      {
        clientName,
        requirements: dto.requirements,
        budgetRange: dto.budgetRange ?? 'Not specified',
      },
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

    const parsed = this.tryParseSections(result.text);

    return new ProposalDraftResponseDto(
      parsed?.scope ?? '',
      parsed?.deliverables ?? [],
      parsed?.timeline ?? '',
      parsed?.pricingAssumptions ?? [],
      parsed?.risks ?? [],
      parsed?.exclusions ?? [],
      parsed?.technologyStack ?? [],
      result.text,
      parsed !== null,
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
    );
  }

  private async resolveSubjectName(dto: GenerateProposalDto, tenantId: string): Promise<string> {
    if (dto.clientId) {
      const client = await this.clientRepository.findActiveById(dto.clientId, tenantId);
      if (!client) {
        throw new BadRequestException(`Client ${dto.clientId} not found`);
      }
      return client.name;
    }

    const lead = await this.leadRepository.findActiveById(dto.leadId!, tenantId);
    if (!lead) {
      throw new BadRequestException(`Lead ${dto.leadId} not found`);
    }
    return lead.organization ?? lead.contactName;
  }

  // The model is instructed (in the prompt template itself) to return
  // ONLY a JSON object — but an LLM's own "only JSON" compliance isn't
  // guaranteed, so this still has to tolerate: a clean JSON object, JSON
  // wrapped in a markdown code fence (models do this anyway despite
  // being told not to), or genuinely unparseable prose. Anything other
  // than a clean object with the expected array/string shapes is treated
  // as unparsed — `rawText`/`parsedSuccessfully: false` on the response
  // is what a caller actually falls back to, not a best-effort partial
  // parse that could silently misattribute content to the wrong field.
  private tryParseSections(text: string): ParsedProposalSections | null {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      const asStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];

      if (typeof data.scope !== 'string' || typeof data.timeline !== 'string') {
        return null;
      }

      return {
        scope: data.scope,
        deliverables: asStringArray(data.deliverables),
        timeline: data.timeline,
        pricingAssumptions: asStringArray(data.pricingAssumptions),
        risks: asStringArray(data.risks),
        exclusions: asStringArray(data.exclusions),
        technologyStack: asStringArray(data.technologyStack),
      };
    } catch {
      return null;
    }
  }
}
