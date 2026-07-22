import { validate } from 'class-validator';
import { NotificationListQueryDto } from './notification-list-query.dto';

describe('NotificationListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new NotificationListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new NotificationListQueryDto(), {
      status: 'FAILED',
      userId: '00000000-0000-7000-8000-000000002301',
      type: 'order.shipped',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'shipped',
      sortBy: 'status',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new NotificationListQueryDto(), { sortBy: 'title' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid NotificationStatus', async () => {
    const dto = Object.assign(new NotificationListQueryDto(), { status: 'DELIVERED' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when userId is not a UUID', async () => {
    const dto = Object.assign(new NotificationListQueryDto(), { userId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('userId');
  });
});
