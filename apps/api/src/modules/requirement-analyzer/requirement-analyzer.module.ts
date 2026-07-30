import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { RequirementAnalyzerController } from './requirement-analyzer.controller';
import { RequirementAnalyzerService } from './requirement-analyzer.service';
import { DocumentTextExtractor } from './document-text-extractor';

// Requirement Analyzer (Phase 8, Step 4) — one controller/service plus
// the isolated DocumentTextExtractor (see its own header comment).
// Imports PromptsModule for PromptTemplateService, same pattern
// ProposalGeneratorModule already established. AiService/StorageService
// come from their own @Global() modules, no import needed.
@Module({
  imports: [PromptsModule],
  controllers: [RequirementAnalyzerController],
  providers: [RequirementAnalyzerService, DocumentTextExtractor],
})
export class RequirementAnalyzerModule {}
