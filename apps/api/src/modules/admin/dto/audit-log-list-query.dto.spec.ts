import { validate } from 'class-validator';
import { AuditLogListQueryDto } from './audit-log-list-query.dto';

describe('AuditLogListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new AuditLogListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new AuditLogListQueryDto(), {
      actorUserId: '00000000-0000-7000-8000-000000002301',
      action: 'order.created',
      resourceType: 'order',
      resourceId: '00000000-0000-7000-8000-000000002601',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'order',
      sortBy: 'action',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new AuditLogListQueryDto(), { sortBy: 'actorUserId' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when actorUserId is not a UUID', async () => {
    const dto = Object.assign(new AuditLogListQueryDto(), { actorUserId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('actorUserId');
  });
});
