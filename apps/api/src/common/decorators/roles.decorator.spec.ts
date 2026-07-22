import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';
import { ROLES_KEY } from './authorization-metadata.constant';

// Proves @Roles() is metadata-only: SetMetadata() attaches a plain array
// under ROLES_KEY, retrievable via Reflector the same way RolesGuard
// itself reads it — no authorization decision happens here, only
// metadata attachment.
describe('Roles', () => {
  it('attaches the given role keys as reflectable metadata on a method', () => {
    class TestController {
      @Roles('admin', 'super_admin')
      handler() {}
    }

    const reflector = new Reflector();
    const roles = reflector.get<string[]>(ROLES_KEY, TestController.prototype.handler);

    expect(roles).toEqual(['admin', 'super_admin']);
  });

  it('supports being applied at the class level', () => {
    @Roles('admin')
    class TestController {}

    const reflector = new Reflector();
    const roles = reflector.get<string[]>(ROLES_KEY, TestController);

    expect(roles).toEqual(['admin']);
  });
});
