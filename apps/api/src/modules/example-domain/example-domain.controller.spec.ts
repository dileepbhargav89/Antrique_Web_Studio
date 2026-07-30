import { Test } from '@nestjs/testing';
import { ExampleDomainController } from './example-domain.controller';
import { ExampleDomainService } from './example-domain.service';
import { PingResponseDto } from './dto/ping-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

// Unlike example-domain.service.spec.ts (a plain unit test — no DI
// involved), this resolves the controller through a real Nest
// TestingModule so DI wiring itself is verified, not just the service's
// own logic — the one thing a hand-constructed `new
// ExampleDomainController(new ExampleDomainService())` wouldn't catch
// (e.g. a missing @Injectable(), a provider left out of the module).
// `TokenService`/`AuthorizationService` are provided as mocks (Milestone
// 2/3): referencing `JwtAuthGuard`/`RolesGuard`/`PermissionsGuard` via
// `@UseGuards()` metadata pulls all three into this module's DI graph —
// Nest eagerly instantiates every injectable a compiled TestingModule can
// reach, including guards attached to controller methods, not only what a
// test explicitly calls — so their dependencies need to resolve even
// though this test never exercises any guard itself (see
// common/guards/README.md's "Testing note", first documented in
// Milestone 2 and still accurate). `@UseGuards(...)`/`@Roles()`/
// `@Permissions()`/`@CurrentUser()` are HTTP pipeline metadata — calling
// `controller.ping(user)`/`controller.permissionPing(user)` directly here,
// the same way every other controller spec in this codebase calls its
// controller's methods directly, never triggers any of it; that's exactly
// why RolesGuard/PermissionsGuard have their own dedicated specs
// (common/guards/roles.guard.spec.ts, permissions.guard.spec.ts) and this
// milestone's live-boot `curl` check exists — this test is only about
// ExampleDomainController -> ExampleDomainService delegation.
describe('ExampleDomainController', () => {
  function compileModule() {
    return Test.createTestingModule({
      controllers: [ExampleDomainController],
      providers: [
        ExampleDomainService,
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();
  }

  it("resolves ExampleDomainService via DI and delegates ping() to it with the current user's email", async () => {
    const moduleRef = await compileModule();
    const controller = moduleRef.get(ExampleDomainController);

    const result = controller.ping({ email: 'user@example.com' });

    expect(result).toEqual(new PingResponseDto('user@example.com'));
  });

  it("resolves ExampleDomainService via DI and delegates permissionPing() to it with the current user's email", async () => {
    const moduleRef = await compileModule();
    const controller = moduleRef.get(ExampleDomainController);

    const result = controller.permissionPing({ email: 'user@example.com' });

    expect(result).toEqual(new PingResponseDto('user@example.com'));
  });

  it('resolves ExampleDomainService via DI and delegates organization() to it with the resolved tenantId/organization (Milestone 4)', async () => {
    const moduleRef = await compileModule();
    const controller = moduleRef.get(ExampleDomainController);
    const organization = { id: 'tenant-1', name: 'Antrique Web Studio', slug: 'antrique' };

    const result = controller.organization({ tenantId: 'tenant-1' }, organization);

    expect(result).toEqual(new OrganizationResponseDto('tenant-1', organization));
  });
});
