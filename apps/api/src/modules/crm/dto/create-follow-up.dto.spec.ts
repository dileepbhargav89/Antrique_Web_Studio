import { validate } from 'class-validator';
import { CreateFollowUpDto } from './create-follow-up.dto';

describe('CreateFollowUpDto', () => {
  function makeDto(overrides: Partial<CreateFollowUpDto> = {}): CreateFollowUpDto {
    const dto = new CreateFollowUpDto();
    Object.assign(dto, {
      customerId: '00000000-0000-7000-8000-000000002301',
      title: 'Call back',
      dueAt: '2099-01-01T00:00:00.000Z',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with customerId set', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with leadId set instead of customerId', async () => {
    const dto = makeDto({ customerId: undefined, leadId: '00000000-0000-7000-8000-000000000201' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        description: 'Follow up on the proposal',
        assigneeId: '00000000-0000-7000-8000-000000000001',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when title is empty', async () => {
    const errors = await validate(makeDto({ title: '' }));
    expect(errors.map((e) => e.property)).toContain('title');
  });

  it('fails validation when dueAt is not a valid ISO date string', async () => {
    const errors = await validate(makeDto({ dueAt: 'not-a-date' }));
    expect(errors.map((e) => e.property)).toContain('dueAt');
  });

  it('fails validation when leadId is not a UUID', async () => {
    const errors = await validate(makeDto({ customerId: undefined, leadId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('leadId');
  });
});
