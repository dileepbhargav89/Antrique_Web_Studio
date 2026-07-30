export type TaskSuggestionType = 'epic' | 'story' | 'task' | 'subtask';

// Deliberately FLAT — no nested epic->story->task->subtask object graph.
// Phase 7's real schema only has Project->Milestone->Task (no Epic/Story/
// Subtask tables, and none are being added — "Build on the existing
// architecture," this phase's own rule). `type` carries the hierarchy
// level as plain metadata a human reviews; every suggestion maps onto
// the same real `Task` row shape once approved, regardless of `type`.
export class TaskSuggestionDto {
  constructor(
    readonly type: TaskSuggestionType,
    readonly title: string,
    readonly description: string,
    readonly acceptanceCriteria: string[],
  ) {}
}
