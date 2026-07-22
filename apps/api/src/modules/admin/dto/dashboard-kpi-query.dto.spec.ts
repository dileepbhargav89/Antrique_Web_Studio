import { validate } from 'class-validator';
import { DashboardKpiQueryDto } from './dashboard-kpi-query.dto';

describe('DashboardKpiQueryDto', () => {
  it('passes validation with no fields set (date range is optional)', async () => {
    const errors = await validate(new DashboardKpiQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a valid date range set', async () => {
    const dto = Object.assign(new DashboardKpiQueryDto(), {
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when dateFrom is not a valid ISO date string', async () => {
    const dto = Object.assign(new DashboardKpiQueryDto(), { dateFrom: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('dateFrom');
  });
});
