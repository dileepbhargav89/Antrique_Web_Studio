import { validate } from 'class-validator';
import { CreateMeasurementDto } from './create-measurement.dto';

describe('CreateMeasurementDto', () => {
  function makeDto(overrides: Partial<CreateMeasurementDto> = {}): CreateMeasurementDto {
    const dto = new CreateMeasurementDto();
    Object.assign(dto, { name: 'Chest', value: '40.00', unit: 'IN', ...overrides });
    return dto;
  }

  it('passes validation with the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with notes set', async () => {
    const errors = await validate(makeDto({ notes: 'Measured standing' }));
    expect(errors).toHaveLength(0);
  });

  it('fails validation when value is not a numeric string', async () => {
    const errors = await validate(makeDto({ value: 'forty' }));
    expect(errors.map((e) => e.property)).toContain('value');
  });

  it('fails validation when unit is not IN or CM', async () => {
    const errors = await validate(makeDto({ unit: 'FEET' as never }));
    expect(errors.map((e) => e.property)).toContain('unit');
  });

  it('fails validation when name is empty', async () => {
    const errors = await validate(makeDto({ name: '' }));
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
