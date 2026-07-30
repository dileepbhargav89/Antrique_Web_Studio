import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { ProjectEstimatorController } from './project-estimator.controller';
import { ProjectEstimatorService } from './project-estimator.service';

// Project Estimator (Phase 8, Step 5) — one controller/service, no
// persistence. Imports PromptsModule for PromptTemplateService, same
// pattern ProposalGeneratorModule/RequirementAnalyzerModule already
// established. AiService comes from the @Global() AiModule.
@Module({
  imports: [PromptsModule],
  controllers: [ProjectEstimatorController],
  providers: [ProjectEstimatorService],
})
export class ProjectEstimatorModule {}
