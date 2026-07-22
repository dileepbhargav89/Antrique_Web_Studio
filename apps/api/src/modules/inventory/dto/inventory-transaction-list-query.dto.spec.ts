import { validate } from 'class-validator';
import { InventoryTransactionListQueryDto } from './inventory-transaction-list-query.dto';

describe('InventoryTransactionListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new InventoryTransactionListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new InventoryTransactionListQueryDto(), {
      inventoryItemId: '00000000-0000-7000-8000-000000000001',
      warehouseId: '00000000-0000-7000-8000-000000000002',
      type: 'RECEIPT',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when type is not a valid InventoryTransactionType', async () => {
    const dto = Object.assign(new InventoryTransactionListQueryDto(), { type: 'SHIPMENT' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('type');
  });

  it('fails validation when dateFrom is not a valid ISO date string', async () => {
    const dto = Object.assign(new InventoryTransactionListQueryDto(), { dateFrom: 'yesterday' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('dateFrom');
  });
});
