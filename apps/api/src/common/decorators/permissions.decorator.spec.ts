import { Reflector } from '@nestjs/core';
import { Permissions } from './permissions.decorator';
import { PERMISSIONS_KEY } from './authorization-metadata.constant';

describe('Permissions', () => {
  it('attaches the given permission keys as reflectable metadata on a method', () => {
    class TestController {
      @Permissions('projects:write')
      handler() {}
    }

    const reflector = new Reflector();
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, TestController.prototype.handler);

    expect(permissions).toEqual(['projects:write']);
  });

  it('supports multiple required permission keys', () => {
    class TestController {
      @Permissions('projects:read', 'projects:write')
      handler() {}
    }

    const reflector = new Reflector();
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, TestController.prototype.handler);

    expect(permissions).toEqual(['projects:read', 'projects:write']);
  });
});
