import { Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { AiService } from '../../ai';
import { EstimateProjectDto } from './dto/estimate-project.dto';
import { ProjectEstimateResponseDto } from './dto/project-estimate-response.dto';
import { PROJECT_ESTIMATION_TEMPLATE_KEY } from './constants/project-estimator.constant';

interface ParsedEstimateSections {
  estimatedHours: string;
  sprintCount: string;
  teamSize: string;
  budgetRange: string;
  complexity: string;
  dependencies: string[];
  confidenceScore: number | null;
}

// Step 5 (Project Estimator) — same "writes nothing, returns a draft for
// human review" shape ProposalGeneratorService/RequirementAnalyzerService
// already establish (see either one's own header comment for the
// reasoning: an estimate is a starting point for a human-owned business
// decision, not an authoritative number this codebase auto-applies
// anywhere). No lead/client/project link — the spec's own Step 5 brief
// takes a scope of work as input, nothing else.
@Injectable()
export class ProjectEstimatorService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly aiService: AiService,
  ) {}

  async estimate(dto: EstimateProjectDto, tenantId: string): Promise<ProjectEstimateResponseDto> {
    const renderedPrompt = await this.promptTemplateService.renderByKey(
      PROJECT_ESTIMATION_TEMPLATE_KEY,
      { scopeOfWork: dto.scopeOfWork },
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

    return new ProjectEstimateResponseDto(
      parsed?.estimatedHours ?? '',
      parsed?.sprintCount ?? '',
      parsed?.teamSize ?? '',
      parsed?.budgetRange ?? '',
      parsed?.complexity ?? '',
      parsed?.dependencies ?? [],
      parsed?.confidenceScore ?? null,
      result.text,
      parsed !== null,
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
    );
  }

  // Same tolerant-parse shape every Phase 8 generation feature uses — see
  // proposal-generator.service.ts's own comment on the reasoning.
  private tryParseSections(text: string): ParsedEstimateSections | null {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      const asStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];

      if (typeof data.estimatedHours !== 'string' || typeof data.complexity !== 'string') {
        return null;
      }

      return {
        estimatedHours: data.estimatedHours,
        sprintCount: typeof data.sprintCount === 'string' ? data.sprintCount : '',
        teamSize: typeof data.teamSize === 'string' ? data.teamSize : '',
        budgetRange: typeof data.budgetRange === 'string' ? data.budgetRange : '',
        complexity: data.complexity,
        dependencies: asStringArray(data.dependencies),
        confidenceScore: typeof data.confidenceScore === 'number' ? data.confidenceScore : null,
      };
    } catch {
      return null;
    }
  }
}
