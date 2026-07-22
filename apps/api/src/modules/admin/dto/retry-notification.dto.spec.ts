import { validate } from 'class-validator';
import { RetryNotificationDto } from './retry-notification.dto';

describe('RetryNotificationDto', () => {
  it('passes validation with no fields set (note is optional)', async () => {
    const errors = await validate(new RetryNotificationDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a note set', async () => {
    const dto = Object.assign(new RetryNotificationDto(), {
      note: 'Retrying after provider outage resolved',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when note exceeds 500 characters', async () => {
    const dto = Object.assign(new RetryNotificationDto(), { note: 'x'.repeat(501) });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('note');
  });
});
