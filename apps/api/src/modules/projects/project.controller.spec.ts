import { Test } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { ProjectStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createProjectRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'project-1',
    tenantId: TENANT.tenantId,
    clientId: 'client-1',
    leadId: null,
    name: 'Storefront Relaunch',
    summary: null,
    status: ProjectStatus.DRAFT,
    startDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as modules/crm/lead.controller.spec.ts — resolves through
// a real Nest TestingModule so DI wiring itself is verified
// (ProjectController -> ProjectService -> its six repository deps).
describe('ProjectController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        ProjectService,
        {
          provide: ProjectRepository,
          useValue: {
            findActiveById: jest.fn(async () => createProjectRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async () => createProjectRow()),
            update: jest.fn(async () => createProjectRow()),
          },
        },
        {
          provide: ProjectMemberRepository,
          useValue: {
            listByProject: jest.fn(async () => []),
            findOneMember: jest.fn(async () => null),
            create: jest.fn(async () => ({
              userId: 'user-1',
              role: 'CONTRIBUTOR',
              addedAt: new Date(),
            })),
            removeMember: jest.fn(async () => undefined),
          },
        },
        {
          provide: MilestoneRepository,
          useValue: { countCompletion: jest.fn(async () => ({ total: 0, approved: 0 })) },
        },
        { provide: ActivityLogRepository, useValue: { record: jest.fn(async () => undefined) } },
        {
          provide: ClientRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'client-1' })) },
        },
        {
          provide: LeadRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'lead-1' })) },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(ProjectController);
  }

  it('resolves ProjectService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateProjectDto(), {
      clientId: 'client-1',
      name: 'New Project',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Storefront Relaunch');
  });

  it('delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() and returns computed completion data', async () => {
    const controller = await createController();

    const result = await controller.findById('project-1', TENANT);

    expect(result.completionPercent).toBe(0);
    expect(result.members).toEqual([]);
  });

  it('delegates archive() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.archive('project-1', TENANT);

    expect(result.id).toBe('project-1');
  });
});
