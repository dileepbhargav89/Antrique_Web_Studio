import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { DocumentTextExtractor } from './document-text-extractor';
import { AiService } from '../../ai';
import { StorageService } from '../../storage';
import { RequirementAnalysisResponseDto } from './dto/requirement-analysis-response.dto';
import {
  REQUIREMENT_ANALYSIS_TEMPLATE_KEY,
  MAX_DOCUMENT_TEXT_CHARS,
} from './constants/requirement-analyzer.constant';

interface ParsedRequirementSections {
  features: string[];
  modules: string[];
  risks: string[];
  timelineEstimate: string;
  questions: string[];
}

export interface AnalyzeRequirementDocumentInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

// Step 4 (Requirement Analyzer) — same "writes no new business-entity
// row, returns a draft for human review" shape ProposalGeneratorService
// already establishes (see that service's own header comment). The one
// thing this module DOES persist is the uploaded document itself, via
// the existing `StorageService` (the spec's own "Reuse StorageService"
// instruction) — an audit trail of what was analyzed, not a new
// "RequirementAnalysis" entity/table.
@Injectable()
export class RequirementAnalyzerService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly documentTextExtractor: DocumentTextExtractor,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
  ) {}

  async analyze(
    input: AnalyzeRequirementDocumentInput,
    tenantId: string,
  ): Promise<RequirementAnalysisResponseDto> {
    const extractedText = await this.documentTextExtractor.extract(
      input.buffer,
      input.originalName,
    );
    if (!extractedText.trim()) {
      throw new BadRequestException(
        'No extractable text found in this document — it may be scanned/image-only.',
      );
    }

    const truncated = extractedText.length > MAX_DOCUMENT_TEXT_CHARS;
    const documentText = truncated
      ? extractedText.slice(0, MAX_DOCUMENT_TEXT_CHARS)
      : extractedText;

    const key = `requirement-documents/${tenantId}/${randomUUID()}-${input.originalName}`;
    const documentUrl = await this.storageService.upload({
      key,
      body: input.buffer,
      contentType: input.mimeType,
    });

    const renderedPrompt = await this.promptTemplateService.renderByKey(
      REQUIREMENT_ANALYSIS_TEMPLATE_KEY,
      { documentText },
      tenantId,
    );

    const result = await this.aiService.complete({
      messages: [{ role: 'user', content: renderedPrompt }],
    });

    const parsed = this.tryParseSections(result.text);

    return new RequirementAnalysisResponseDto(
      parsed?.features ?? [],
      parsed?.modules ?? [],
      parsed?.risks ?? [],
      parsed?.timelineEstimate ?? '',
      parsed?.questions ?? [],
      result.text,
      parsed !== null,
      documentUrl,
      input.originalName,
      truncated,
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
    );
  }

  // Same tolerant-parse shape ProposalGeneratorService.tryParseSections()
  // already establishes — see that method's own comment for the
  // reasoning (strip markdown fences, fail closed to `null` rather than a
  // partial/misattributed parse).
  private tryParseSections(text: string): ParsedRequirementSections | null {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      const asStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];

      if (typeof data.timelineEstimate !== 'string') {
        return null;
      }

      return {
        features: asStringArray(data.features),
        modules: asStringArray(data.modules),
        risks: asStringArray(data.risks),
        timelineEstimate: data.timelineEstimate,
        questions: asStringArray(data.questions),
      };
    } catch {
      return null;
    }
  }
}
