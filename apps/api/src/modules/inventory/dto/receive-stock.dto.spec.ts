import { validate } from 'class-validator';
import { ReceiveStockDto } from './receive-stock.dto';

describe('ReceiveStockDto', () => {
  function makeDto(overrides: Partial<ReceiveStockDto> = {}): ReceiveStockDto {
    const dto = new ReceiveStockDto();
    Object.assign(dto, {
      warehouseId: '00000000-0000-7000-8000-000000000001',
      fabricId: '00000000-0000-7000-8000-000000000002',
      quantity: '150',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with a fabricId and no productVariantId', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a productVariantId and no fabricId', async () => {
    const dto = makeDto({
      fabricId: undefined,
      productVariantId: '00000000-0000-7000-8000-000000000003',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes DTO-level validation with BOTH set — the XOR rule is enforced by the service, not this DTO', async () => {
    const dto = makeDto({ productVariantId: '00000000-0000-7000-8000-000000000003' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when quantity is not a numeric string', async () => {
    const errors = await validate(makeDto({ quantity: 'a lot' }));
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('fails validation when warehouseId is not a UUID', async () => {
    const errors = await validate(makeDto({ warehouseId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('warehouseId');
  });
});
