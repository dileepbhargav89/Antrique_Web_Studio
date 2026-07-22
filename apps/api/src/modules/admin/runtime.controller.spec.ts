import { Test } from '@nestjs/testing';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { RuntimeInfoResponseDto } from './dto/runtime-info-response.dto';

describe('RuntimeController', () => {
  async function createController(runtimeInfo: RuntimeInfoResponseDto) {
    const moduleRef = await Test.createTestingModule({
      controllers: [RuntimeController],
      providers: [
        { provide: RuntimeService, useValue: { getRuntimeInfo: jest.fn(async () => runtimeInfo) } },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(RuntimeController);
  }

  it('resolves RuntimeService via DI and returns its result as-is', async () => {
    const expected = new RuntimeInfoResponseDto('1.0.0', 'abc123', 'production', 42, 'now', 'ok');
    const controller = await createController(expected);

    const result = await controller.getRuntimeInfo();

    expect(result).toBe(expected);
  });
});
