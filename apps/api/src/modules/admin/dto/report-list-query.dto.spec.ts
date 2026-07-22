import { validate } from 'class-validator';
import { ReportListQueryDto } from './report-list-query.dto';

describe('ReportListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new ReportListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new ReportListQueryDto(), {
      type: 'CRM_SUMMARY',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      sortBy: 'type',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new ReportListQueryDto(), { sortBy: 'result' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when type is not a valid ReportType', async () => {
    const dto = Object.assign(new ReportListQueryDto(), { type: 'MARKETING_SUMMARY' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('type');
  });
});
