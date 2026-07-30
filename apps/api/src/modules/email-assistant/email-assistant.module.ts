import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { EmailAssistantController } from './email-assistant.controller';
import { EmailAssistantService } from './email-assistant.service';

// Email Assistant (Phase 8, Step 8) — one controller/service, no
// repository of its own (nothing persists). Imports PromptsModule for
// PromptTemplateService. AiService and EmailService both come from their
// respective @Global() modules, same as every other Phase 8 module.
@Module({
  imports: [PromptsModule],
  controllers: [EmailAssistantController],
  providers: [EmailAssistantService],
})
export class EmailAssistantModule {}
