import { validate } from 'class-validator';
import { LeadListQueryDto } from './lead-list-query.dto';

describe('LeadListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new LeadListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new LeadListQueryDto(), {
      status: 'QUALIFIED',
      assigneeId: '00000000-0000-7000-8000-000000000001',
      leadSourceId: '00000000-0000-7000-8000-000000002801',
      source: 'website',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'jordan',
      sortBy: 'contactName',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new LeadListQueryDto(), { sortBy: 'contactEmail' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid LeadStatus', async () => {
    const dto = Object.assign(new LeadListQueryDto(), { status: 'PROSPECT' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when dateFrom is not a valid ISO date string', async () => {
    const dto = Object.assign(new LeadListQueryDto(), { dateFrom: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('dateFrom');
  });

  it('fails validation when assigneeId is not a UUID', async () => {
    const dto = Object.assign(new LeadListQueryDto(), { assigneeId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('assigneeId');
  });
});
