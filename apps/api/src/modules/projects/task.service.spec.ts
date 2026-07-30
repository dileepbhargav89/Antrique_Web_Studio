import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskRepository } from './repositories/task.repository';
import { ProjectRepository } from './repositories/project.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: TENANT_ID,
    projectId: 'project-1',
    milestoneId: null,
    assigneeId: null,
    title: 'Draft wireframe',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    completedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createService(
  overrides: {
    taskRepository?: Partial<Record<string, unknown>>;
    projectRepository?: Partial<Record<string, unknown>>;
    milestoneRepository?: Partial<Record<string, unknown>>;
  } = {},
) {
  const taskRepository = {
    findActiveById: jest.fn(async () => createTaskRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createTaskRow()),
    update: jest.fn(async () => createTaskRow()),
    ...overrides.taskRepository,
  } as unknown as TaskRepository;

  const projectRepository = {
    findActiveById: jest.fn(async () => ({ id: 'project-1' })),
    ...overrides.projectRepository,
  } as unknown as ProjectRepository;

  const milestoneRepository = {
    findActiveById: jest.fn(async () => ({ id: 'milestone-1', projectId: 'project-1' })),
    ...overrides.milestoneRepository,
  } as unknown as MilestoneRepository;

  const activityLogRepository = {
    record: jest.fn(async () => undefined),
  } as unknown as ActivityLogRepository;

  return new TaskService(
    taskRepository,
    projectRepository,
    milestoneRepository,
    activityLogRepository,
  );
}

describe('TaskService', () => {
  describe('create()', () => {
    it('creates a task scoped to the given tenantId, always starting TODO/MEDIUM', async () => {
      const createFn = jest.fn(async () => createTaskRow());
      const service = createService({ taskRepository: { create: createFn } });
      const dto = Object.assign(new CreateTaskDto(), {
        projectId: 'project-1',
        title: 'Draft wireframe',
      });

      await service.create(dto, TENANT_ID);

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          projectId: 'project-1',
          title: 'Draft wireframe',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
        }),
      });
    });

    it('rejects when projectId does not resolve to a real project', async () => {
      const service = createService({
        projectRepository: { findActiveById: jest.fn(async () => null) },
      });
      const dto = Object.assign(new CreateTaskDto(), {
        projectId: 'missing',
        title: 'Draft wireframe',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when milestoneId belongs to a different project', async () => {
      const service = createService({
        milestoneRepository: {
          findActiveById: jest.fn(async () => ({ id: 'milestone-1', projectId: 'other-project' })),
        },
      });
      const dto = Object.assign(new CreateTaskDto(), {
        projectId: 'project-1',
        milestoneId: 'milestone-1',
        title: 'Draft wireframe',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the task does not exist', async () => {
      const service = createService({
        taskRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('sets completedAt when status first transitions to DONE', async () => {
      const updateFn = jest.fn(async () => createTaskRow({ status: TaskStatus.DONE }));
      const service = createService({ taskRepository: { update: updateFn } });
      const dto = Object.assign(new UpdateTaskDto(), { status: TaskStatus.DONE });

      await service.update('task-1', dto, TENANT_ID);

      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: TaskStatus.DONE, completedAt: expect.any(Date) }),
      });
    });

    it('throws NotFoundException when the task does not exist', async () => {
      const service = createService({
        taskRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.update('missing', new UpdateTaskDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
