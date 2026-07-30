import { ProjectStatus } from '../../../../generated/prisma/enums';
import { ProjectMemberResponseDto } from './project-member-response.dto';

// GET /projects/:id's richer shape — adds the two fields a list row would
// be wasteful to compute for every row (completionPercent needs a
// milestone count query; members needs a join query), same "detail
// endpoint carries more than the list row" precedent QuotationDetail-style
// responses elsewhere in this codebase already follow.
export class ProjectDetailResponseDto {
  constructor(
    readonly id: string,
    readonly clientId: string,
    readonly leadId: string | null,
    readonly name: string,
    readonly summary: string | null,
    readonly status: ProjectStatus,
    readonly startDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    // Approved milestones / total milestones, 0 when the project has none
    // yet — see project.service.ts's own comment on why this is computed,
    // not a stored column.
    readonly completionPercent: number,
    readonly members: ProjectMemberResponseDto[],
  ) {}
}
