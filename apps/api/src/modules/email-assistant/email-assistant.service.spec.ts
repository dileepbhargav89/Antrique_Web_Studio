import { EmailAssistantService } from './email-assistant.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { EmailService } from '../../email';
import { AiService } from '../../ai';
import { GenerateEmailDto } from './dto/generate-email.dto';
import { SendEmailDto } from './dto/send-email.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const VALID_JSON_RESPONSE = JSON.stringify({
  subject: 'Following up on your project',
  body: 'Hi Jordan,\n\nJust checking in on next steps.\n\nBest,\nAntrique',
});

function createService(
  overrides: {
    promptTemplateService?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
    emailService?: Partial<Record<string, unknown>>;
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
      inputTokens: 100,
      outputTokens: 80,
      latencyMs: 500,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  const emailService = {
    send: jest.fn(async () => ({ status: 'sent', id: 'email-1' })),
    ...overrides.emailService,
  } as unknown as EmailService;

  return new EmailAssistantService(promptTemplateService, aiService, emailService);
}

describe('EmailAssistantService', () => {
  describe('generate()', () => {
    it('renders the template with human-readable emailType and the given fields', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'FOLLOW_UP',
        recipientName: 'Jordan',
        purpose: 'checking in on the project',
        keyPoints: 'timeline, next steps',
      });

      await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'client-email-v1',
        {
          emailType: 'follow-up',
          recipientName: 'Jordan',
          purpose: 'checking in on the project',
          keyPoints: 'timeline, next steps',
        },
        TENANT_ID,
      );
    });

    it('defaults keyPoints to a placeholder when not provided', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'MEETING_REQUEST',
        recipientName: 'Jordan',
        purpose: 'schedule a kickoff call',
      });

      await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'client-email-v1',
        expect.objectContaining({ keyPoints: 'none provided' }),
        TENANT_ID,
      );
    });

    it('parses a valid JSON response into subject/body', async () => {
      const service = createService();
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'FOLLOW_UP',
        recipientName: 'Jordan',
        purpose: 'checking in',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.subject).toBe('Following up on your project');
      expect(result.body).toContain('Just checking in on next steps.');
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
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'FOLLOW_UP',
        recipientName: 'Jordan',
        purpose: 'checking in',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.subject).toBe('Following up on your project');
    });

    it('falls back to empty subject/body and parsedSuccessfully=false on unparseable output', async () => {
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
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'FOLLOW_UP',
        recipientName: 'Jordan',
        purpose: 'checking in',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(false);
      expect(result.subject).toBe('');
      expect(result.body).toBe('');
      expect(result.rawText).toBe('Sorry, I cannot help with that.');
    });

    it('does not call EmailService', async () => {
      const send = jest.fn();
      const service = createService({ emailService: { send } });
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'FOLLOW_UP',
        recipientName: 'Jordan',
        purpose: 'checking in',
      });

      await service.generate(dto, TENANT_ID);

      expect(send).not.toHaveBeenCalled();
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
      const dto = Object.assign(new GenerateEmailDto(), {
        type: 'PROPOSAL',
        recipientName: 'Jordan',
        purpose: 'send the proposal',
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

  describe('send()', () => {
    it('sends via EmailService with escaped, paragraph-wrapped HTML, and makes no AI call', async () => {
      const send = jest.fn(async () => ({ status: 'sent', id: 'email-1' }));
      const complete = jest.fn();
      const service = createService({ emailService: { send }, aiService: { complete } });
      const dto = Object.assign(new SendEmailDto(), {
        to: 'jordan@example.com',
        subject: 'Following up',
        body: 'Line one.\n\nLine two & more.',
      });

      const result = await service.send(dto);

      expect(complete).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith({
        to: 'jordan@example.com',
        subject: 'Following up',
        html: '<p>Line one.</p>\n<p>Line two &amp; more.</p>',
      });
      expect(result.status).toBe('sent');
      expect(result.id).toBe('email-1');
    });

    it('maps a skipped result (no provider configured) through', async () => {
      const send = jest.fn(async () => ({
        status: 'skipped',
        reason: 'Email provider not configured',
      }));
      const service = createService({ emailService: { send } });
      const dto = Object.assign(new SendEmailDto(), {
        to: 'jordan@example.com',
        subject: 'Following up',
        body: 'Body text.',
      });

      const result = await service.send(dto);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('Email provider not configured');
    });

    it('maps a failed result through', async () => {
      const send = jest.fn(async () => ({
        status: 'failed',
        error: 'Provider rejected the request',
      }));
      const service = createService({ emailService: { send } });
      const dto = Object.assign(new SendEmailDto(), {
        to: 'jordan@example.com',
        subject: 'Following up',
        body: 'Body text.',
      });

      const result = await service.send(dto);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Provider rejected the request');
    });
  });
});
