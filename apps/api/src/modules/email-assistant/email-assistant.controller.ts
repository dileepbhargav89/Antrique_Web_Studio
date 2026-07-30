import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EMAIL_ASSISTANT_ROUTE } from './constants/email-assistant.constant';
import { EmailAssistantService } from './email-assistant.service';
import { GenerateEmailDto } from './dto/generate-email.dto';
import { EmailDraftResponseDto } from './dto/email-draft-response.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendEmailResponseDto } from './dto/send-email-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PERMISSION } from '../auth/constants/permission.constant';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Email Assistant')
@ApiBearerAuth('bearer')
@Controller(EMAIL_ASSISTANT_ROUTE)
export class EmailAssistantController {
  constructor(private readonly emailAssistantService: EmailAssistantService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({
    summary: 'Draft a proposal/follow-up/meeting-request/project-update/invoice-reminder email',
    description:
      'Real external AI call — real latency, real cost. Writes nothing, sends nothing; review the ' +
      'draft, then POST the reviewed subject/body to /email-assistant/send to actually send it.',
  })
  @ApiCreatedResponse({ type: EmailDraftResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  generate(
    @Body() dto: GenerateEmailDto,
    @Tenant() tenant: TenantContext,
  ): Promise<EmailDraftResponseDto> {
    return this.emailAssistantService.generate(dto, tenant.tenantId);
  }

  // Gated under `emails:send`, not `prompt_templates:write` — this route
  // makes no AI call and has a real external side effect (an actual email
  // sent via the live provider), the same "the real-effecting action gets
  // its own, stricter permission" treatment Task Generator's own
  // `approve()` gives `tasks:write`.
  @Post('send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.EMAILS_SEND)
  @ApiOperation({
    summary: 'Send a reviewed email through the live email provider',
    description: 'No AI call — pure send, via the existing EmailService, unchanged.',
  })
  @ApiOkResponse({ type: SendEmailResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  send(@Body() dto: SendEmailDto): Promise<SendEmailResponseDto> {
    return this.emailAssistantService.send(dto);
  }
}
