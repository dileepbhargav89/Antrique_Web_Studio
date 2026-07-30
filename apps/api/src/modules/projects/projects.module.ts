import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { MilestoneController } from './milestone.controller';
import { MilestoneService } from './milestone.service';
import { MilestoneRepository } from './repositories/milestone.repository';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskRepository } from './repositories/task.repository';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentRepository } from './repositories/document.repository';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentRepository } from './repositories/comment.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';

// Project/Task/Milestone (Phase 7) — the one genuine greenfield build the
// workflow audit found (docs/implementation/phase-7-workflow-matrix.md):
// Project/ProjectMember/Milestone/Task/Document/ActivityLog were fully
// modeled in schema.prisma since Phase 1.1A with zero application-layer
// consumers and no migration; Comment is new this phase. Five controller/
// service/repository triads (Project, Milestone, Task, Document, Comment)
// sharing one ActivityLogRepository — every write path across all five
// writes an ActivityLog row, which is what backs the Project workspace's
// "Activity" tab.
//
// Imports CrmModule (for its exported ClientRepository/LeadRepository) —
// ProjectService.create() verifies clientId/leadId exist before creating a
// Project against them, same "import the owning module for its exported
// repository" pattern BillingModule already established for
// CatalogModule/OrdersModule. StorageModule/PdfModule/EmailModule are
// @Global() — no import needed for DocumentService's StorageService use.
//
// `exports: [TaskService, MilestoneRepository]` (Phase 8, Step 6) — the
// Task Generator's "approve" action creates REAL Task rows through this
// module's own `TaskService.create()` rather than re-implementing task
// creation — the actual "AI enhances the existing workflow, doesn't
// bypass it" rule the Phase 8 brief asks for. `MilestoneRepository` is
// for reading a milestone's title/description as generation context when
// the caller generates from an existing milestone rather than free-text
// requirements.
@Module({
  imports: [CrmModule],
  controllers: [
    ProjectController,
    MilestoneController,
    TaskController,
    DocumentController,
    CommentController,
  ],
  providers: [
    ProjectService,
    ProjectRepository,
    ProjectMemberRepository,
    MilestoneService,
    MilestoneRepository,
    TaskService,
    TaskRepository,
    DocumentService,
    DocumentRepository,
    CommentService,
    CommentRepository,
    ActivityLogRepository,
  ],
  exports: [TaskService, MilestoneRepository],
})
export class ProjectsModule {}
