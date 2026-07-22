import { ExampleDomainService } from './example-domain.service';
import { PingResponseDto } from './dto/ping-response.dto';

describe('ExampleDomainService', () => {
  it('returns a PingResponseDto with status "ok" and the given authenticatedAs', () => {
    const service = new ExampleDomainService();

    const result = service.ping('user@example.com');

    expect(result).toEqual(new PingResponseDto('user@example.com'));
    expect(result.status).toBe('ok');
    expect(result.authenticatedAs).toBe('user@example.com');
  });
});
