import { BadRequestException } from '@nestjs/common';
import { TaskGeneratorService } from './task-generator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { MilestoneRepository } from '../projects/repositories/milestone.repository';
import { TaskService } from '../projects/task.service';
import { AiService } from '../../ai';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { ApproveTasksDto } from './dto/approve-tasks.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const PROJECT_ID = '00000000-0000-7000-8000-000000000010';
const MILESTONE_ID = '00000000-0000-7000-8000-000000000020';

const VALID_JSON_RESPONSE = JSON.stringify({
  suggestions: [
    {
      type: 'story',
      title: 'Build login page',
      description: 'Implement the login form',
      acceptanceCriteria: ['User can submit credentials'],
    },
    {
      type: 'task',
      title: 'Wire up validation',
      description: '',
      acceptanceCriteria: [],
    },
  ],
});

function createService(
  overrides: {
    promptTemplateService?: Partial<Record<string, unknown>>;
    milestoneRepository?: Partial<Record<string, unknown>>;
    taskService?: Partial<Record<string, unknown>>;
    aiService?: Partial<Record<string, unknown>>;
  } = {},
) {
  const promptTemplateService = {
    renderByKey: jest.fn(async () => 'rendered prompt text'),
    ...overrides.promptTemplateService,
  } as unknown as PromptTemplateService;

  const milestoneRepository = {
    findActiveById: jest.fn(async () => ({
      id: MILESTONE_ID,
      projectId: PROJECT_ID,
      title: 'Launch milestone',
      description: 'Ship the MVP',
    })),
    ...overrides.milestoneRepository,
  } as unknown as MilestoneRepository;

  const taskService = {
    create: jest.fn(async (dto: Record<string, unknown>) => ({
      id: 'task-1',
      ...dto,
    })),
    ...overrides.taskService,
  } as unknown as TaskService;

  const aiService = {
    complete: jest.fn(async () => ({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      text: VALID_JSON_RESPONSE,
      inputTokens: 100,
      outputTokens: 80,
      latencyMs: 500,
      stopReason: 'end_turn',
    })),
    ...overrides.aiService,
  } as unknown as AiService;

  return new TaskGeneratorService(
    promptTemplateService,
    milestoneRepository,
    taskService,
    aiService,
  );
}

describe('TaskGeneratorService', () => {
  describe('generate()', () => {
    it('rejects when neither milestoneId nor requirements is provided', async () => {
      const service = createService();
      const dto = Object.assign(new GenerateTasksDto(), { projectId: PROJECT_ID });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when milestoneId does not resolve to a milestone on the given project', async () => {
      const service = createService({
        milestoneRepository: {
          findActiveById: jest.fn(async () => ({
            id: MILESTONE_ID,
            projectId: 'a-different-project',
            title: 'Other project milestone',
          })),
        },
      });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        milestoneId: MILESTONE_ID,
      });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when milestoneId does not resolve to any milestone', async () => {
      const service = createService({
        milestoneRepository: { findActiveById: jest.fn(async () => null) },
      });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        milestoneId: MILESTONE_ID,
      });

      await expect(service.generate(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('renders the template with milestone context and parses a valid JSON response', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        milestoneId: MILESTONE_ID,
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'task-generation-v1',
        expect.objectContaining({
          context: expect.stringContaining('Launch milestone'),
        }),
        TENANT_ID,
      );
      expect(result.parsedSuccessfully).toBe(true);
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toMatchObject({ type: 'story', title: 'Build login page' });
    });

    it('renders the template with free-text requirements when no milestoneId is given', async () => {
      const renderByKey = jest.fn(async () => 'rendered prompt text');
      const service = createService({ promptTemplateService: { renderByKey } });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        requirements: 'Build a checkout flow',
      });

      await service.generate(dto, TENANT_ID);

      expect(renderByKey).toHaveBeenCalledWith(
        'task-generation-v1',
        expect.objectContaining({ context: expect.stringContaining('Build a checkout flow') }),
        TENANT_ID,
      );
    });

    it('strips markdown code fences before parsing', async () => {
      const fenced = '```json\n' + VALID_JSON_RESPONSE + '\n```';
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: fenced,
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        requirements: 'Build a checkout flow',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.suggestions).toHaveLength(2);
    });

    it('filters out malformed suggestion entries instead of discarding the whole batch', async () => {
      const mixed = JSON.stringify({
        suggestions: [
          { type: 'story', title: 'Valid one', description: '', acceptanceCriteria: [] },
          { type: 'not-a-real-type', title: 'Bad type' },
          { type: 'task', description: 'Missing title' },
        ],
      });
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: mixed,
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        requirements: 'Build a checkout flow',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]?.title).toBe('Valid one');
    });

    it('falls back to rawText/parsedSuccessfully=false on unparseable output', async () => {
      const service = createService({
        aiService: {
          complete: jest.fn(async () => ({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            text: 'Sorry, I cannot help with that.',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 100,
            stopReason: 'end_turn',
          })),
        },
      });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        requirements: 'Build a checkout flow',
      });

      const result = await service.generate(dto, TENANT_ID);

      expect(result.parsedSuccessfully).toBe(false);
      expect(result.rawText).toBe('Sorry, I cannot help with that.');
      expect(result.suggestions).toEqual([]);
    });

    it('does not call the milestone repository when only requirements are given', async () => {
      const findActiveById = jest.fn(async () => null);
      const service = createService({ milestoneRepository: { findActiveById } });
      const dto = Object.assign(new GenerateTasksDto(), {
        projectId: PROJECT_ID,
        requirements: 'Build a checkout flow',
      });

      await service.generate(dto, TENANT_ID);

      expect(findActiveById).not.toHaveBeenCalled();
    });
  });

  describe('approve()', () => {
    it('creates one real Task per approved suggestion via TaskService.create(), and makes no AI call', async () => {
      const create = jest.fn(async (dto: Record<string, unknown>) => ({ id: 'task-1', ...dto }));
      const complete = jest.fn();
      const service = createService({ taskService: { create }, aiService: { complete } });
      const dto = Object.assign(new ApproveTasksDto(), {
        projectId: PROJECT_ID,
        milestoneId: MILESTONE_ID,
        tasks: [
          { title: 'Build login page', description: 'Implement the login form' },
          { title: 'Wire up validation' },
        ],
      });

      const result = await service.approve(dto, TENANT_ID);

      expect(complete).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(2);
      expect(create).toHaveBeenNthCalledWith(
        1,
        {
          projectId: PROJECT_ID,
          milestoneId: MILESTONE_ID,
          title: 'Build login page',
          description: 'Implement the login form',
          priority: undefined,
        },
        TENANT_ID,
      );
      expect(result.created).toHaveLength(2);
    });

    it('creates tasks sequentially, not with Promise.all', async () => {
      const order: string[] = [];
      const create = jest.fn(async (dto: Record<string, unknown>) => {
        order.push(`start:${dto.title as string}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
        order.push(`end:${dto.title as string}`);
        return { id: 'task-x', ...dto };
      });
      const service = createService({ taskService: { create } });
      const dto = Object.assign(new ApproveTasksDto(), {
        projectId: PROJECT_ID,
        tasks: [{ title: 'First' }, { title: 'Second' }],
      });

      await service.approve(dto, TENANT_ID);

      expect(order).toEqual(['start:First', 'end:First', 'start:Second', 'end:Second']);
    });
  });
});
