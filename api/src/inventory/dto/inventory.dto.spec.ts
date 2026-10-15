import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdjustStockDto, CreateStockMovementDto, CreateWarehouseDto, TransferStockDto } from './inventory.dto.js';

const ids = {
  productId: '11111111-1111-4111-8111-111111111111',
  warehouseId: '22222222-2222-4222-8222-222222222222',
  sourceWarehouseId: '22222222-2222-4222-8222-222222222222',
  destinationWarehouseId: '33333333-3333-4333-8333-333333333333',
};

async function errors(dto: object) {
  return validate(dto);
}

describe('Inventory DTO precision validation', () => {
  it('accepts stock quantities up to three decimal places and costs up to two', async () => {
    const dto = plainToInstance(CreateStockMovementDto, {
      ...ids, quantity: '1.125', unitCost: '12.34',
    });
    expect(await errors(dto)).toHaveLength(0);
  });

  it('rejects receipt or issue quantities with more than three decimal places', async () => {
    const dto = plainToInstance(CreateStockMovementDto, {
      ...ids, quantity: '1.1234', unitCost: '12.34',
    });
    expect((await errors(dto)).map(error => error.property)).toContain('quantity');
  });

  it('rejects stock movement unit costs with more than two decimal places', async () => {
    const dto = plainToInstance(CreateStockMovementDto, {
      ...ids, quantity: '1.125', unitCost: '12.345',
    });
    expect((await errors(dto)).map(error => error.property)).toContain('unitCost');
  });

  it('rejects adjustments with quantities beyond the supported stock precision', async () => {
    const dto = plainToInstance(AdjustStockDto, {
      productId: ids.productId, warehouseId: ids.warehouseId, newQuantity: '2.0001',
    });
    expect((await errors(dto)).map(error => error.property)).toContain('newQuantity');
  });

  it('rejects transfers with quantities beyond three decimal places', async () => {
    const dto = plainToInstance(TransferStockDto, {
      ...ids, quantity: '0.0001',
    });
    expect((await errors(dto)).map(error => error.property)).toContain('quantity');
  });

  it('rejects warehouse capacity with more than two decimal places', async () => {
    const dto = plainToInstance(CreateWarehouseDto, {
      code: 'MAIN', name: 'Main Warehouse', capacity: '10.123',
    });
    expect((await errors(dto)).map(error => error.property)).toContain('capacity');
  });
});
