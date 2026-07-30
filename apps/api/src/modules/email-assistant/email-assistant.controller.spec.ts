import { Test } from '@nestjs/testing';
import { EmailAssistantController } from './email-assistant.controller';
import { EmailAssistantService } from './email-assistant.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { EmailService } from '../../email';
import { AiService, AiProviderFactory } from '../../ai';
import { GenerateEmailDto } from './dto/generate-email.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

const VALID_JSON_RESPONSE = JSON.stringify({
  subject: 'Following up on your project',
  body: 'Just checking in on next steps.',
});

// Same reasoning as content-assistant.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (EmailAssistantController -> EmailAssistantService -> its 3 deps).
describe('EmailAssistantController', () => {
  async function createController(overrides: { emailServiceSend?: jest.Mock } = {}) {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmailAssistantController],
      providers: [
        EmailAssistantService,
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
        {
          provide: EmailService,
          useValue: {
            send:
              overrides.emailServiceSend ??
              jest.fn(async () => ({ status: 'sent', id: 'email-1' })),
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

    return moduleRef.get(EmailAssistantController);
  }

  it('resolves EmailAssistantService via DI and delegates generate()', async () => {
    const controller = await createController();
    const dto = Object.assign(new GenerateEmailDto(), {
      type: 'FOLLOW_UP',
      recipientName: 'Jordan',
      purpose: 'checking in',
    });

    const result = await controller.generate(dto, TENANT);

    expect(result.parsedSuccessfully).toBe(true);
    expect(result.subject).toBe('Following up on your project');
  });

  it('resolves EmailAssistantService via DI and delegates send()', async () => {
    const send = jest.fn(async () => ({ status: 'sent', id: 'email-1' }));
    const controller = await createController({ emailServiceSend: send });
    const dto = Object.assign(new SendEmailDto(), {
      to: 'jordan@example.com',
      subject: 'Following up',
      body: 'Just checking in.',
    });

    const result = await controller.send(dto);

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('sent');
  });
});
