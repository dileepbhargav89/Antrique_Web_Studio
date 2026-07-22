import { validate } from 'class-validator';
import { CreateMeasurementProfileDto } from './create-measurement-profile.dto';
import { CreateMeasurementDto } from './create-measurement.dto';

describe('CreateMeasurementProfileDto', () => {
  function makeDto(
    overrides: Partial<CreateMeasurementProfileDto> = {},
  ): CreateMeasurementProfileDto {
    const dto = new CreateMeasurementProfileDto();
    Object.assign(dto, { name: 'Default Measurements', ...overrides });
    return dto;
  }

  it('passes validation with just the required name', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with userId, notes, and nested measurements set', async () => {
    const measurement = Object.assign(new CreateMeasurementDto(), {
      name: 'Chest',
      value: '40.00',
      unit: 'IN',
    });
    const errors = await validate(
      makeDto({
        userId: '00000000-0000-7000-8000-000000000001',
        notes: 'Repeat client',
        measurements: [measurement],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when a nested measurement is invalid (propagates via @ValidateNested)', async () => {
    const badMeasurement = Object.assign(new CreateMeasurementDto(), {
      name: 'Chest',
      value: 'not-a-number',
      unit: 'IN',
    });
    const errors = await validate(makeDto({ measurements: [badMeasurement] }));
    expect(errors.map((e) => e.property)).toContain('measurements');
  });

  it('fails validation when userId is not a UUID', async () => {
    const errors = await validate(makeDto({ userId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('userId');
  });
});
