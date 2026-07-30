import { BadRequestException, Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { TaskService } from '../projects/task.service';
import { MilestoneRepository } from '../projects/repositories/milestone.repository';
import { AiService } from '../../ai';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { TaskGenerationResponseDto } from './dto/task-generation-response.dto';
import { TaskSuggestionDto, type TaskSuggestionType } from './dto/task-suggestion.dto';
import { ApproveTasksDto } from './dto/approve-tasks.dto';
import { ApproveTasksResponseDto } from './dto/approve-tasks-response.dto';
import { TASK_GENERATION_TEMPLATE_KEY } from './constants/task-generator.constant';
import { TaskResponseDto } from '../projects/dto/task-response.dto';

const VALID_SUGGESTION_TYPES: readonly TaskSuggestionType[] = ['epic', 'story', 'task', 'subtask'];

// Step 6 (Task Generator) — the one Phase 8 generation feature with a
// REAL second action beyond "return a draft": `approve()` creates actual
// `Task` rows via Phase 7's own `TaskService.create()` (imported from
// `ProjectsModule`, not re-implemented — see that module's own comment).
// `generate()` itself still writes nothing — same "AI drafts, a human
// decides what becomes real" shape every other Phase 8 feature uses; the
// difference here is Task Generator's own spec explicitly names the next
// step ("Allow manual approval"), so this module owns that step too,
// rather than leaving it to some future, unspecified caller the way
// Proposal Generator leaves "create the real Quotation" to the existing,
// separate `POST /quotations` route.
@Injectable()
export class TaskGeneratorService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly taskService: TaskService,
    private readonly aiService: AiService,
  ) {}

  async generate(dto: GenerateTasksDto, tenantId: string): Promise<TaskGenerationResponseDto> {
    if (!dto.milestoneId && !dto.requirements) {
      throw new BadRequestException('At least one of milestoneId or requirements must be provided');
    }

    const context = await this.buildContext(dto, tenantId);

    const renderedPrompt = await this.promptTemplateService.renderByKey(
      TASK_GENERATION_TEMPLATE_KEY,
      { context },
      tenantId,
    );

    const result = await this.aiService.complete(
      {
        messages: [{ role: 'user', content: renderedPrompt }],
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
      },
      dto.provider,
    );

    const suggestions = this.tryParseSuggestions(result.text);

    return new TaskGenerationResponseDto(
      suggestions ?? [],
      result.text,
      suggestions !== null,
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.latencyMs,
    );
  }

  // The actual "Allow manual approval" mechanism — creates real Task
  // rows, one per approved suggestion, via the existing, unchanged
  // TaskService.create(). Sequential, not Promise.all: a failure partway
  // (e.g. an invalid milestoneId) surfaces clearly with whatever
  // succeeded before it already persisted, rather than an all-or-nothing
  // transaction this isn't — approving N independent tasks isn't a
  // financial operation that needs atomicity the way a Payment does.
  async approve(dto: ApproveTasksDto, tenantId: string): Promise<ApproveTasksResponseDto> {
    const created: TaskResponseDto[] = [];
    for (const task of dto.tasks) {
      const createdTask = await this.taskService.create(
        {
          projectId: dto.projectId,
          milestoneId: dto.milestoneId,
          title: task.title,
          description: task.description,
          priority: task.priority,
        },
        tenantId,
      );
      created.push(createdTask);
    }
    return new ApproveTasksResponseDto(created);
  }

  private async buildContext(dto: GenerateTasksDto, tenantId: string): Promise<string> {
    const parts: string[] = [];

    if (dto.milestoneId) {
      const milestone = await this.milestoneRepository.findActiveById(dto.milestoneId, tenantId);
      if (!milestone || milestone.projectId !== dto.projectId) {
        throw new BadRequestException(
          `Milestone ${dto.milestoneId} not found on project ${dto.projectId}`,
        );
      }
      parts.push(`Milestone: ${milestone.title}`);
      if (milestone.description) {
        parts.push(`Milestone description: ${milestone.description}`);
      }
    }

    if (dto.requirements) {
      parts.push(`Requirements:\n${dto.requirements}`);
    }

    return parts.join('\n\n');
  }

  // Same tolerant-parse shape every Phase 8 generation feature uses —
  // strip markdown fences, fail closed to `null` on anything that isn't
  // a clean array of well-shaped objects, rather than a partial/
  // misattributed parse. Unlike the other features' single-object
  // parsers, this one also filters out any array entry with an
  // unrecognized `type` or a missing `title` — a model that mostly
  // complied but produced one malformed entry shouldn't discard the
  // whole batch, but shouldn't silently accept garbage either.
  private tryParseSuggestions(text: string): TaskSuggestionDto[] | null {
    const withoutFences = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
      const data = JSON.parse(withoutFences.trim()) as Record<string, unknown>;
      if (!Array.isArray(data.suggestions)) {
        return null;
      }

      const suggestions: TaskSuggestionDto[] = [];
      for (const item of data.suggestions) {
        if (
          typeof item !== 'object' ||
          item === null ||
          typeof (item as Record<string, unknown>).title !== 'string' ||
          !VALID_SUGGESTION_TYPES.includes(
            (item as Record<string, unknown>).type as TaskSuggestionType,
          )
        ) {
          continue;
        }
        const record = item as Record<string, unknown>;
        suggestions.push(
          new TaskSuggestionDto(
            record.type as TaskSuggestionType,
            record.title as string,
            typeof record.description === 'string' ? record.description : '',
            Array.isArray(record.acceptanceCriteria)
              ? record.acceptanceCriteria.filter((c): c is string => typeof c === 'string')
              : [],
          ),
        );
      }
      return suggestions.length > 0 ? suggestions : null;
    } catch {
      return null;
    }
  }
}
