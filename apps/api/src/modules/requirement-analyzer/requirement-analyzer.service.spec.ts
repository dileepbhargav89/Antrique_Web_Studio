import { BadRequestException } from '@nestjs/common';
import { RequirementAnalyzerService } from './requirement-analyzer.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { DocumentTextExtractor } from './document-text-extractor';
import { AiService } from '../../ai';
import { StorageService } from '../../storage';
import { MAX_DOCUMENT_TEXT_CHARS } from './constants/requirement-analyzer.constant';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const VALID_JSON_RESPONSE = JSON.stringify({
  features: ['Login', 'Checkout'],
  modules: ['Auth', 'Billing'],
  risks: ['Tight timeline'],
  timelineEstimate: '8 weeks',
  questions: ['What payment gateway?'],
});

function createService(
  overrides: {
    promptTemplateService?: Partial<Record<string, unknown>>;
    documentTextExtractor?: Partial<Record<string, unknown>>;
    storageService?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const promptTemplateService = {
    renderByKey: jest.fn(async () => 'rendered prompt text'),
    ...overrides.promptTemplateService,
  } as unknown as PromptTemplateService;

  const documentTextExtractor = {
    extract: jest.fn(async () => 'Extracted requirements text.'),
    ...overrides.documentTextExtractor,
  } as unknown as DocumentTextExtractor;

  const storageService = {
    upload: jest.fn(async () => 'https://storage.example.com/requirement-documents/brief.pdf'),
    ...overrides.storageService,
  } as unknown as StorageService;

  const aiService = {
    complete: jest.fn(async () => ({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      text: VALID_JSON_RESPONSE,
      inputTokens: 200,
      outputTokens: 100,
      latencyMs: 600,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  return new RequirementAnalyzerService(
    promptTemplateService,
    documentTextExtractor,
    storageService,
    aiService,
  );
}

describe('RequirementAnalyzerService', () => {
  describe('analyze()', () => {
    it('rejects a document with no extractable text', async () => {
      const service = createService({
        documentTextExtractor: { extract: jest.fn(async () => '   ') },
      });

      await expect(
        service.analyze(
          { buffer: Buffer.from(''), mimeType: 'text/plain', originalName: 'blank.txt' },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('uploads the original file via StorageService', async () => {
      const uploadFn = jest.fn(async () => 'https://storage.example.com/x.pdf');
      const service = createService({ storageService: { upload: uploadFn } });

      await service.analyze(
        {
          buffer: Buffer.from('pdf-bytes'),
          mimeType: 'application/pdf',
          originalName: 'brief.pdf',
        },
        TENANT_ID,
      );

      expect(uploadFn).toHaveBeenCalledWith(
        expect.objectContaining({ body: Buffer.from('pdf-bytes'), contentType: 'application/pdf' }),
      );
    });

    it('renders the template with the extracted text and parses a valid JSON response', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });

      const result = await service.analyze(
        { buffer: Buffer.from('text'), mimeType: 'text/plain', originalName: 'brief.txt' },
        TENANT_ID,
      );

      expect(renderByKey).toHaveBeenCalledWith(
        'requirement-analysis-v1',
        { documentText: 'Extracted requirements text.' },
        TENANT_ID,
      );
      expect(result.parsedSuccessfully).toBe(true);
      expect(result.features).toEqual(['Login', 'Checkout']);
      expect(result.timelineEstimate).toBe('8 weeks');
      expect(result.documentUrl).toBe(
        'https://storage.example.com/requirement-documents/brief.pdf',
      );
      expect(result.truncated).toBe(false);
    });

    it('truncates and flags very long extracted text', async () => {
      const longText = 'a'.repeat(MAX_DOCUMENT_TEXT_CHARS + 5000);
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({
        documentTextExtractor: { extract: jest.fn(async () => longText) },
        promptTemplateService: { renderByKey },
      });

      const result = await service.analyze(
        { buffer: Buffer.from('x'), mimeType: 'text/plain', originalName: 'huge.txt' },
        TENANT_ID,
      );

      expect(result.truncated).toBe(true);
      expect(renderByKey).toHaveBeenCalledWith(
        'requirement-analysis-v1',
        { documentText: expect.stringMatching(new RegExp(`^a{${MAX_DOCUMENT_TEXT_CHARS}}$`)) },
        TENANT_ID,
      );
    });

    it('falls back to rawText/parsedSuccessfully=false on unparseable output', async () => {
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: 'not json',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 50,
            stopReason: 'end_turn',
          })),
        },
      });

      const result = await service.analyze(
        { buffer: Buffer.from('text'), mimeType: 'text/plain', originalName: 'brief.txt' },
        TENANT_ID,
      );

      expect(result.parsedSuccessfully).toBe(false);
      expect(result.rawText).toBe('not json');
      expect(result.features).toEqual([]);
    });
  });
});
