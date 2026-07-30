import { Project, ProjectMember, ActivityLog } from '../../../../generated/prisma/client';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectDetailResponseDto } from '../dto/project-detail-response.dto';
import { ProjectMemberResponseDto } from '../dto/project-member-response.dto';
import { ActivityLogResponseDto } from '../dto/activity-log-response.dto';

export function toProjectResponseDto(project: Project): ProjectResponseDto {
  return new ProjectResponseDto(
    project.id,
    project.clientId,
    project.leadId,
    project.name,
    project.summary,
    project.status,
    project.startDate,
    project.createdAt,
    project.updatedAt,
  );
}

export function toProjectMemberResponseDto(member: ProjectMember): ProjectMemberResponseDto {
  return new ProjectMemberResponseDto(member.userId, member.role, member.addedAt);
}

export function toActivityLogResponseDto(entry: ActivityLog): ActivityLogResponseDto {
  return new ActivityLogResponseDto(
    entry.id,
    entry.projectId,
    entry.actorUserId,
    entry.verb,
    entry.summary,
    entry.metadata,
    entry.createdAt,
  );
}

export function toProjectDetailResponseDto(
  project: Project,
  completionPercent: number,
  members: ProjectMember[],
): ProjectDetailResponseDto {
  return new ProjectDetailResponseDto(
    project.id,
    project.clientId,
    project.leadId,
    project.name,
    project.summary,
    project.status,
    project.startDate,
    project.createdAt,
    project.updatedAt,
    completionPercent,
    members.map(toProjectMemberResponseDto),
  );
}
