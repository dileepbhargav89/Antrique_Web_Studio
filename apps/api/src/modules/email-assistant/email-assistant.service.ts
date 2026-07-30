import { Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { EmailService } from '../../email';
import { AiService } from '../../ai';
import { GenerateEmailDto } from './dto/generate-email.dto';
import { EmailDraftResponseDto } from './dto/email-draft-response.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendEmailResponseDto } from './dto/send-email-response.dto';
import { CLIENT_EMAIL_TEMPLATE_KEY, EMAIL_TYPE_LABELS } from './constants/email-assistant.constant';

// Step 8 (AI Email Assistant) — the two actions are independent, not a
// generate/approve pair like Step 6's Task Generator: `generate()` drafts
// a subject/body from a brief (ephemeral, no DB write — Step 8's own spec
// has no "store drafts" instruction, unlike Step 7's Content Assistant).
// `send()` takes human-reviewed content and sends it for real through the
// existing, unchanged `EmailService` ("Reuse EmailService" — this step's
// own brief) — no reference back to a generated draft required, a caller
// can call `send()` with hand-written content it never generated at all.
@Injectable()
export class EmailAssistantService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly aiService: AiService,
    private readonly emailService: EmailService,
  ) {}

  async generate(dto: GenerateEmailDto, tenantId: string): Promise<EmailDraftResponseDto> {
    const renderedPrompt = await this.promptTemplateService.renderByKey(
      CLIENT_EMAIL_TEMPLATE_KEY,
      {
        emailType: EMAIL_TYPE_LABELS[dto.type],
        recipientName: dto.recipientName,
        purpose: dto.purpose,
        keyPoints: dto.keyPoints ?? 'none provided',
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

    const parsed = this.tryParseDraft(result.text);

    return new EmailDraftResponseDto(
      parsed?.subject ?? '',
      parsed?.body ?? '',
      result.text,
      parsed !== null,
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
    );
  }

  // No AI call — pure persistence-free pass-through to the existing,
  // unchanged EmailService, the same "reuse the existing service, don't
  // re-implement it" treatment Task Generator's own `approve()` gives
  // TaskService.
  async send(dto: SendEmailDto): Promise<SendEmailResponseDto> {
    const result = await this.emailService.send({
      to: dto.to,
      subject: dto.subject,
      html: this.toSimpleHtml(dto.body),
    });

    if (result.status === 'sent') {
      return new SendEmailResponseDto('sent', result.id);
    }
    if (result.status === 'skipped') {
      return new SendEmailResponseDto('skipped', undefined, result.reason);
    }
    return new SendEmailResponseDto('failed', undefined, undefined, result.error);
  }

  private tryParseDraft(text: string): { subject: string; body: string } | null {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      if (typeof data.subject === 'string' && typeof data.body === 'string') {
        return { subject: data.subject, body: data.body };
      }
      return null;
    } catch {
      return null;
    }
  }

  // The AI drafts plain text (the template asks for a JSON string, not
  // markup); `EmailService.send()` requires `html`. A minimal, dependency-
  // free escape + paragraph-break conversion is enough for a plain
  // drafted email — no markdown renderer needed for what's still just
  // paragraphs of prose.
  private toSimpleHtml(body: string): string {
    const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }
}
