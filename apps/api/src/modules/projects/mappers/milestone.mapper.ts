import { Milestone } from '../../../../generated/prisma/client';
import { MilestoneResponseDto } from '../dto/milestone-response.dto';

export function toMilestoneResponseDto(milestone: Milestone): MilestoneResponseDto {
  return new MilestoneResponseDto(
    milestone.id,
    milestone.projectId,
    milestone.title,
    milestone.description,
    milestone.status,
    milestone.dueDate,
    milestone.completedAt,
    milestone.createdAt,
    milestone.updatedAt,
  );
}
