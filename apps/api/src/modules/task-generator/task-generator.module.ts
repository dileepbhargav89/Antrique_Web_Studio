import { Module } from '@nestjs/common';
import { PromptsModule } from '../prompts/prompts.module';
import { ProjectsModule } from '../projects/projects.module';
import { TaskGeneratorController } from './task-generator.controller';
import { TaskGeneratorService } from './task-generator.service';

// Task Generator (Phase 8, Step 6) — one controller/service, no
// repository of its own. Imports PromptsModule (PromptTemplateService)
// and ProjectsModule (its exported TaskService/MilestoneRepository) —
// `approve()` creates real Task rows through the existing, unchanged
// TaskService, not a duplicate implementation (see the service's own
// header comment).
@Module({
  imports: [PromptsModule, ProjectsModule],
  controllers: [TaskGeneratorController],
  providers: [TaskGeneratorService],
})
export class TaskGeneratorModule {}
