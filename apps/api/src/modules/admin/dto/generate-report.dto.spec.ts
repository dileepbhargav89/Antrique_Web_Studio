import { validate } from 'class-validator';
import { GenerateReportDto } from './generate-report.dto';

describe('GenerateReportDto', () => {
  it('fails validation when type is not set (required)', async () => {
    const errors = await validate(new GenerateReportDto());
    expect(errors.map((e) => e.property)).toContain('type');
  });

  it('passes validation with only type set', async () => {
    const dto = Object.assign(new GenerateReportDto(), { type: 'SALES_SUMMARY' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with type and a date range set', async () => {
    const dto = Object.assign(new GenerateReportDto(), {
      type: 'BILLING_SUMMARY',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when type is not a valid ReportType', async () => {
    const dto = Object.assign(new GenerateReportDto(), { type: 'MARKETING_SUMMARY' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('type');
  });
});
