import { validate } from 'class-validator';
import { AdjustStockDto } from './adjust-stock.dto';

describe('AdjustStockDto', () => {
  it('passes validation with a positive delta', async () => {
    const dto = Object.assign(new AdjustStockDto(), { delta: '5' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('passes validation with a negative delta', async () => {
    const dto = Object.assign(new AdjustStockDto(), { delta: '-5', reason: 'Damaged units' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when delta is not a numeric string', async () => {
    const dto = Object.assign(new AdjustStockDto(), { delta: 'five' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('delta');
  });
});
