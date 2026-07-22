import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';
import { CreateOrderItemDto } from './create-order-item.dto';

describe('CreateOrderDto', () => {
  function makeItem(overrides: Partial<CreateOrderItemDto> = {}): CreateOrderItemDto {
    return Object.assign(new CreateOrderItemDto(), {
      warehouseId: '00000000-0000-7000-8000-000000000901',
      productVariantId: '00000000-0000-7000-8000-000000000601',
      quantity: '2',
      ...overrides,
    });
  }

  function makeDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
    const dto = new CreateOrderDto();
    Object.assign(dto, {
      customerId: '00000000-0000-7000-8000-000000001001',
      items: [makeItem()],
      ...overrides,
    });
    return dto;
  }

  it('passes validation with a minimal valid order', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        shippingAddressId: '00000000-0000-7000-8000-000000001101',
        billingAddressId: '00000000-0000-7000-8000-000000001102',
        notes: 'Leave at the front desk',
        items: [
          makeItem({
            productCustomizationId: '00000000-0000-7000-8000-000000000604',
            selectedOptions: { styleOptionIds: ['a'] },
          }),
        ],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when customerId is not a UUID', async () => {
    const errors = await validate(makeDto({ customerId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('customerId');
  });

  it('fails validation when items is empty', async () => {
    const errors = await validate(makeDto({ items: [] }));
    expect(errors.map((e) => e.property)).toContain('items');
  });

  it('fails validation when a nested item has an invalid quantity', async () => {
    const errors = await validate(makeDto({ items: [makeItem({ quantity: 'not-a-number' })] }));
    expect(errors.map((e) => e.property)).toContain('items');
  });

  it('fails validation when a nested item is missing warehouseId', async () => {
    const badItem = new CreateOrderItemDto();
    Object.assign(badItem, {
      productVariantId: '00000000-0000-7000-8000-000000000601',
      quantity: '1',
    });
    const errors = await validate(makeDto({ items: [badItem] }));
    expect(errors.map((e) => e.property)).toContain('items');
  });
});
