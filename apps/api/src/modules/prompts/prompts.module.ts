import { Module } from '@nestjs/common';
import { PromptTemplateController } from './prompt-template.controller';
import { PromptTemplateService } from './prompt-template.service';
import { PromptTemplateRepository } from './repositories/prompt-template.repository';

// Prompt Library (Phase 8, Step 2) — one controller/service/repository
// triad. No module imports: AiService (the render+test action's one
// external dependency) comes from the @Global() AiModule, same "no
// explicit import needed for a Global provider" treatment
// StorageService/EmailService already get everywhere they're consumed.
//
// `exports: [PromptTemplateService]` (Phase 8, Step 3) — the Proposal
// Generator reuses this module's own render()/lookup-by-key path rather
// than duplicating prompt logic, the same "import the owning module for
// its exported service" pattern ProjectsModule already established for
// CrmModule's ClientRepository/LeadRepository.
@Module({
  controllers: [PromptTemplateController],
  providers: [PromptTemplateService, PromptTemplateRepository],
  exports: [PromptTemplateService],
})
export class PromptsModule {}
