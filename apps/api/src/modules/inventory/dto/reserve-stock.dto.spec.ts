import { validate } from 'class-validator';
import { ReserveStockDto } from './reserve-stock.dto';

describe('ReserveStockDto', () => {
  it('passes validation with just the required quantity', async () => {
    const dto = Object.assign(new ReserveStockDto(), { quantity: '3' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('passes validation with reference and notes set', async () => {
    const dto = Object.assign(new ReserveStockDto(), {
      quantity: '3',
      reference: 'Order hold',
      notes: 'VIP customer',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when quantity is not a numeric string', async () => {
    const dto = Object.assign(new ReserveStockDto(), { quantity: 'three' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });
});
