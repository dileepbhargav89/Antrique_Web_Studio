import { validate } from 'class-validator';
import { FollowUpListQueryDto } from './follow-up-list-query.dto';

describe('FollowUpListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new FollowUpListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new FollowUpListQueryDto(), {
      status: 'PENDING',
      assigneeId: '00000000-0000-7000-8000-000000000001',
      leadId: '00000000-0000-7000-8000-000000000201',
      customerId: '00000000-0000-7000-8000-000000002301',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'call back',
      sortBy: 'status',
      sortDirection: 'desc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new FollowUpListQueryDto(), { sortBy: 'title' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid FollowUpStatus', async () => {
    const dto = Object.assign(new FollowUpListQueryDto(), { status: 'DONE' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when leadId is not a UUID', async () => {
    const dto = Object.assign(new FollowUpListQueryDto(), { leadId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('leadId');
  });
});
