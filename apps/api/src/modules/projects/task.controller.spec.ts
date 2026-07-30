import { Test } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskRepository } from './repositories/task.repository';
import { ProjectRepository } from './repositories/project.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: TENANT.tenantId,
    projectId: 'project-1',
    milestoneId: null,
    assigneeId: null,
    title: 'Draft wireframe',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as modules/crm/lead.controller.spec.ts — resolves through
// a real Nest TestingModule so DI wiring itself is verified.
describe('TaskController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        TaskService,
        {
          provide: TaskRepository,
          useValue: {
            findActiveById: jest.fn(async () => createTaskRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async () => createTaskRow()),
            update: jest.fn(async () => createTaskRow()),
          },
        },
        {
          provide: ProjectRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'project-1' })) },
        },
        {
          provide: MilestoneRepository,
          useValue: {
            findActiveById: jest.fn(async () => ({ id: 'milestone-1', projectId: 'project-1' })),
          },
        },
        { provide: ActivityLogRepository, useValue: { record: jest.fn(async () => undefined) } },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(TaskController);
  }

  it('resolves TaskService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateTaskDto(), {
      projectId: 'project-1',
      title: 'Draft wireframe',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.title).toBe('Draft wireframe');
  });

  it('delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.findById('task-1', TENANT);

    expect(result.id).toBe('task-1');
  });
});
