import type { TaskResponseDto } from '../../projects/dto/task-response.dto';

// `created` are real, persisted Task rows — reuses Phase 7's own
// TaskResponseDto directly rather than declaring a second shape for the
// same entity.
export class ApproveTasksResponseDto {
  constructor(readonly created: TaskResponseDto[]) {}
}
