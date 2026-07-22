import { validate } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

describe('CreateLeadDto', () => {
  function makeDto(overrides: Partial<CreateLeadDto> = {}): CreateLeadDto {
    const dto = new CreateLeadDto();
    Object.assign(dto, {
      contactName: 'Jordan Rivera',
      contactEmail: 'jordan@example.com',
      source: 'website',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with the minimal required fields plus source', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with leadSourceId instead of source (both optional at the DTO level)', async () => {
    const dto = makeDto({
      source: undefined,
      leadSourceId: '00000000-0000-7000-8000-000000002801',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        organization: 'Nair & Co.',
        serviceInterest: ['Website Design', 'SEO'],
        industry: 'Interior Design',
        assigneeId: '00000000-0000-7000-8000-000000000001',
        metadata: { campaign: 'spring-2026' },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when contactEmail is not a valid email address', async () => {
    const errors = await validate(makeDto({ contactEmail: 'not-an-email' }));
    expect(errors.map((e) => e.property)).toContain('contactEmail');
  });

  it('fails validation when contactName is empty', async () => {
    const errors = await validate(makeDto({ contactName: '' }));
    expect(errors.map((e) => e.property)).toContain('contactName');
  });

  it('fails validation when leadSourceId is not a UUID', async () => {
    const errors = await validate(makeDto({ leadSourceId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('leadSourceId');
  });

  it('fails validation when serviceInterest contains a non-string element', async () => {
    const errors = await validate(makeDto({ serviceInterest: [123 as unknown as string] }));
    expect(errors.map((e) => e.property)).toContain('serviceInterest');
  });
});
