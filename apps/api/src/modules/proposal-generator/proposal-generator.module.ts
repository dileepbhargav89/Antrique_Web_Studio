import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ProposalGeneratorController } from './proposal-generator.controller';
import { ProposalGeneratorService } from './proposal-generator.service';

// Proposal Generator (Phase 8, Step 3) — one controller/service, no
// repository of its own (writes nothing — see the service's own header
// comment). Imports CrmModule (ClientRepository/LeadRepository, to
// resolve the subject's display name) and PromptsModule
// (PromptTemplateService, to render the seeded template) — the same
// "import the owning module for its exported service/repository" pattern
// ProjectsModule already established. AiService comes from the @Global()
// AiModule, no import needed.
@Module({
  imports: [CrmModule, PromptsModule],
  controllers: [ProposalGeneratorController],
  providers: [ProposalGeneratorService],
})
export class ProposalGeneratorModule {}
