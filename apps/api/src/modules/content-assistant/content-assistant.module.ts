import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { ContentAssistantController } from './content-assistant.controller';
import { ContentAssistantService } from './content-assistant.service';
import { ContentDraftRepository } from './repositories/content-draft.repository';

// Content Assistant (Phase 8, Step 7) — one controller/service/repository
// triad. Imports PromptsModule for PromptTemplateService (the shared
// render-by-key path every Phase 8 feature reuses). AiService comes from
// the @Global() AiModule, same as every other Phase 8 module.
@Module({
  imports: [PromptsModule],
  controllers: [ContentAssistantController],
  providers: [ContentAssistantService, ContentDraftRepository],
})
export class ContentAssistantModule {}
