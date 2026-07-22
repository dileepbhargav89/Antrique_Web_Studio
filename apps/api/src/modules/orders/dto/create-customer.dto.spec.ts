import { validate } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { CreateCustomerAddressDto } from './create-customer-address.dto';

describe('CreateCustomerDto', () => {
  function makeDto(overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto {
    const dto = new CreateCustomerDto();
    Object.assign(dto, { email: 'jordan@example.com', ...overrides });
    return dto;
  }

  it('passes validation with just the required email', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a full nested structure', async () => {
    const address = Object.assign(new CreateCustomerAddressDto(), {
      line1: '1 Main St',
      city: 'Newark',
      country: 'USA',
      isDefaultShipping: true,
    });

    const errors = await validate(
      makeDto({
        firstName: 'Jordan',
        lastName: 'Rivera',
        phone: '+1-555-0100',
        status: 'ACTIVE' as never,
        addresses: [address],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when email is not a valid email address', async () => {
    const errors = await validate(makeDto({ email: 'not-an-email' }));
    expect(errors.map((e) => e.property)).toContain('email');
  });

  it('fails validation when status is not a valid CustomerStatus', async () => {
    const errors = await validate(makeDto({ status: 'SUSPENDED' as never }));
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when a nested address is missing required fields', async () => {
    const badAddress = new CreateCustomerAddressDto();
    Object.assign(badAddress, { line1: '1 Main St' });
    const errors = await validate(makeDto({ addresses: [badAddress] }));
    expect(errors.map((e) => e.property)).toContain('addresses');
  });

  it('fails validation when userId is not a UUID', async () => {
    const errors = await validate(makeDto({ userId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('userId');
  });
});
