import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createProjectRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'project-1',
    tenantId: TENANT_ID,
    clientId: 'client-1',
    leadId: null,
    name: 'Storefront Relaunch',
    summary: null,
    status: ProjectStatus.DRAFT,
    startDate: null,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createService(
  overrides: {
    projectRepository?: Partial<Record<string, unknown>>;
    projectMemberRepository?: Partial<Record<string, unknown>>;
    milestoneRepository?: Partial<Record<string, unknown>>;
    clientRepository?: Partial<Record<string, unknown>>;
    leadRepository?: Partial<Record<string, unknown>>;
  } = {},
) {
  const projectRepository = {
    findActiveById: jest.fn(async () => createProjectRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createProjectRow()),
    update: jest.fn(async () => createProjectRow()),
    ...overrides.projectRepository,
  } as unknown as ProjectRepository;

  const projectMemberRepository = {
    listByProject: jest.fn(async () => []),
    findOneMember: jest.fn(async () => null),
    create: jest.fn(async () => ({ userId: 'user-1', role: 'CONTRIBUTOR', addedAt: new Date() })),
    removeMember: jest.fn(async () => undefined),
    ...overrides.projectMemberRepository,
  } as unknown as ProjectMemberRepository;

  const milestoneRepository = {
    countCompletion: jest.fn(async () => ({ total: 0, approved: 0 })),
    ...overrides.milestoneRepository,
  } as unknown as MilestoneRepository;

  const activityLogRepository = {
    record: jest.fn(async () => undefined),
  } as unknown as ActivityLogRepository;

  const clientRepository = {
    findActiveById: jest.fn(async () => ({ id: 'client-1' })),
    ...overrides.clientRepository,
  } as unknown as ClientRepository;

  const leadRepository = {
    findActiveById: jest.fn(async () => ({ id: 'lead-1' })),
    ...overrides.leadRepository,
  } as unknown as LeadRepository;

  return new ProjectService(
    projectRepository,
    projectMemberRepository,
    milestoneRepository,
    activityLogRepository,
    clientRepository,
    leadRepository,
  );
}

describe('ProjectService', () => {
  describe('create()', () => {
    it('creates a project scoped to the given tenantId, always starting DRAFT', async () => {
      const createFn = jest.fn(async () => createProjectRow());
      const service = createService({ projectRepository: { create: createFn } });
      const dto = Object.assign(new CreateProjectDto(), {
        clientId: 'client-1',
        name: 'New Project',
      });

      await service.create(dto, TENANT_ID);

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          clientId: 'client-1',
          name: 'New Project',
          status: ProjectStatus.DRAFT,
        }),
      });
    });

    it('rejects when clientId does not resolve to a real client', async () => {
      const service = createService({
        clientRepository: { findActiveById: jest.fn(async () => null) },
      });
      const dto = Object.assign(new CreateProjectDto(), {
        clientId: 'missing',
        name: 'New Project',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the project does not exist', async () => {
      const service = createService({
        projectRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('computes completionPercent from approved/total milestones', async () => {
      const service = createService({
        milestoneRepository: { countCompletion: jest.fn(async () => ({ total: 4, approved: 1 })) },
      });

      const result = await service.findById('project-1', TENANT_ID);

      expect(result.completionPercent).toBe(25);
    });

    it('returns 0% completion when the project has no milestones yet', async () => {
      const service = createService();

      const result = await service.findById('project-1', TENANT_ID);

      expect(result.completionPercent).toBe(0);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the project does not exist', async () => {
      const service = createService({
        projectRepository: { findActiveById: jest.fn(async () => null) },
      });

      await expect(service.update('missing', new UpdateProjectDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects updates to an archived project', async () => {
      const service = createService({
        projectRepository: {
          findActiveById: jest.fn(async () => createProjectRow({ status: ProjectStatus.ARCHIVED })),
        },
      });

      await expect(service.update('project-1', new UpdateProjectDto(), TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('archive()', () => {
    it('sets status to ARCHIVED', async () => {
      const projectRepositoryUpdate = jest.fn(async () =>
        createProjectRow({ status: ProjectStatus.ARCHIVED }),
      );
      const service = createService({ projectRepository: { update: projectRepositoryUpdate } });

      await service.archive('project-1', TENANT_ID);

      expect(projectRepositoryUpdate).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { status: ProjectStatus.ARCHIVED },
      });
    });

    it('rejects archiving an already-archived project', async () => {
      const service = createService({
        projectRepository: {
          findActiveById: jest.fn(async () => createProjectRow({ status: ProjectStatus.ARCHIVED })),
        },
      });

      await expect(service.archive('project-1', TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('addMember()', () => {
    it('rejects adding a member who is already on the project', async () => {
      const service = createService({
        projectMemberRepository: { findOneMember: jest.fn(async () => ({ userId: 'user-1' })) },
      });

      await expect(service.addMember('project-1', { userId: 'user-1' }, TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
