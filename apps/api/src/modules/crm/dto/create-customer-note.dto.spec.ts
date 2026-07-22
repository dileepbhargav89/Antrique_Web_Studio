import { validate } from 'class-validator';
import { CreateCustomerNoteDto } from './create-customer-note.dto';

describe('CreateCustomerNoteDto', () => {
  function makeDto(overrides: Partial<CreateCustomerNoteDto> = {}): CreateCustomerNoteDto {
    const dto = new CreateCustomerNoteDto();
    Object.assign(dto, {
      customerId: '00000000-0000-7000-8000-000000002301',
      body: 'Hello',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with HTML rich-text content', async () => {
    const errors = await validate(
      makeDto({ body: '<p>Prefers <strong>email</strong> updates.</p>' }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when customerId is not a UUID', async () => {
    const errors = await validate(makeDto({ customerId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('customerId');
  });

  it('fails validation when body is empty', async () => {
    const errors = await validate(makeDto({ body: '' }));
    expect(errors.map((e) => e.property)).toContain('body');
  });
});
