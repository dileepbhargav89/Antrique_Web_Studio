import { Test } from '@nestjs/testing';
import { TaskGeneratorController } from './task-generator.controller';
import { TaskGeneratorService } from './task-generator.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { MilestoneRepository } from '../projects/repositories/milestone.repository';
import { TaskService } from '../projects/task.service';
import { AiService, AiProviderFactory } from '../../ai';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { ApproveTasksDto } from './dto/approve-tasks.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };
const PROJECT_ID = '00000000-0000-7000-8000-000000000010';

const VALID_JSON_RESPONSE = JSON.stringify({
  suggestions: [
    { type: 'task', title: 'Build login page', description: '', acceptanceCriteria: [] },
  ],
});

// Same reasoning as proposal-generator.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (TaskGeneratorController -> TaskGeneratorService -> its four deps).
describe('TaskGeneratorController', () => {
  async function createController(overrides: { taskServiceCreate?: jest.Mock } = {}) {
    const moduleRef = await Test.createTestingModule({
      controllers: [TaskGeneratorController],
      providers: [
        TaskGeneratorService,
        {
          provide: PromptTemplateService,
          useValue: { renderByKey: jest.fn(async () => 'rendered') },
        },
        {
          provide: MilestoneRepository,
          useValue: { findActiveById: jest.fn(async () => null) },
        },
        {
          provide: TaskService,
          useValue: {
            create:
              overrides.taskServiceCreate ??
              jest.fn(async (dto: Record<string, unknown>) => ({ id: 'task-1', ...dto })),
          },
        },
        {
          provide: AiService,
          useValue: {
            complete: jest.fn(async () => ({
              provider: 'anthropic',
              model: 'claude-sonnet-4-5',
              text: VALID_JSON_RESPONSE,
              inputTokens: 20,
              outputTokens: 15,
              latencyMs: 300,
              stopReason: 'end_turn',
            })),
          },
        },
        { provide: AiProviderFactory, useValue: {} },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(TaskGeneratorController);
  }

  it('resolves TaskGeneratorService via DI and delegates generate()', async () => {
    const controller = await createController();
    const dto = Object.assign(new GenerateTasksDto(), {
      projectId: PROJECT_ID,
      requirements: 'Build a checkout flow',
    });

    const result = await controller.generate(dto, TENANT);

    expect(result.parsedSuccessfully).toBe(true);
    expect(result.suggestions).toHaveLength(1);
  });

  it('resolves TaskGeneratorService via DI and delegates approve()', async () => {
    const create = jest.fn(async (dto: Record<string, unknown>) => ({ id: 'task-1', ...dto }));
    const controller = await createController({ taskServiceCreate: create });
    const dto = Object.assign(new ApproveTasksDto(), {
      projectId: PROJECT_ID,
      tasks: [{ title: 'Build login page' }],
    });

    const result = await controller.approve(dto, TENANT);

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.created).toHaveLength(1);
  });
});
