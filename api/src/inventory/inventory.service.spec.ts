import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryService } from './inventory.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('InventoryService', () => {
  let service: InventoryService;
  let db: { query: Mock; transaction: Mock };
  let memberships: { getMembership: Mock };
  let audit: { log: Mock };

  beforeEach(async () => {
    db = { query: vi.fn(), transaction: vi.fn() };
    memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }) };
    audit = { log: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: DatabaseService, useValue: db },
        { provide: MembershipsService, useValue: memberships },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  const user = { userId: 'user-1' } as any;

  it('keeps warehouse listing read-only and does not create a default warehouse', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await service.listWarehouses(user);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('FROM warehouses w');
    expect(db.query.mock.calls[0][0]).not.toContain('INSERT INTO');
  });

  it('keeps stock listing read-only and does not create stock rows or opening movements', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await service.listStock(user);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('FROM inventory_stock_levels s');
    expect(db.query.mock.calls[0][0]).not.toContain('INSERT INTO');
  });

  it('keeps movement history read-only', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await service.listMovements(user);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('FROM inventory_stock_movements m');
    expect(db.query.mock.calls[0][0]).not.toContain('INSERT INTO');
  });

  it('keeps inventory summary read-only', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await service.summary(user);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('FROM inventory_stock_levels s');
    expect(db.query.mock.calls[0][0]).not.toContain('INSERT INTO');
  });

  it('rejects a blank warehouse code before writing to the database', async () => {
    await expect(service.createWarehouse(user, { code: '   ', name: 'Main' })).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects a blank warehouse name before writing to the database', async () => {
    await expect(service.createWarehouse(user, { code: 'MAIN', name: '   ' })).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('normalizes warehouse codes and checks duplicates within the active company', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'warehouse-1' }], rowCount: 1 });

    await expect(service.createWarehouse(user, { code: ' main ', name: 'Main' })).rejects.toThrow(ConflictException);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE company_id=$1 AND UPPER(code)=UPPER($2)'),
      ['company-1', 'MAIN'],
    );
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('returns not found when a warehouse belongs to a different company', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.getWarehouse(user, 'warehouse-other-company')).rejects.toThrow(NotFoundException);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE w.id=$1 AND w.company_id=$2'),
      ['warehouse-other-company', 'company-1'],
    );
  });

  it('posts transfers as paired ledger movements and scopes all stock writes to the membership company', async () => {
    const client = { query: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id,is_service FROM products')) return { rows: [{ id: 'product-1', is_service: false }], rowCount: 1 };
      if (sql.includes('SELECT id FROM warehouses')) return { rows: [{ id: params?.[0] }], rowCount: 1 };
      if (sql.includes('SELECT quantity,reserved_quantity FROM inventory_stock_levels')) return { rows: [{ quantity: '10', reserved_quantity: '2' }], rowCount: 1 };
      if (sql.includes('INSERT INTO inventory_stock_movements')) {
        return { rows: [{ id: params?.[3] === 'transfer_out' ? 'movement-out' : 'movement-in', movement_type: params?.[3], quantity: params?.[4], transfer_group_id: params?.[9] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }) };
    db.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback(client));

    const result = await service.transfer(user, {
      productId: 'product-1',
      sourceWarehouseId: 'warehouse-a',
      destinationWarehouseId: 'warehouse-b',
      quantity: 3,
      unitCost: 12,
    });

    expect(result.sourceMovement.id).toBe('movement-out');
    expect(result.destinationMovement.id).toBe('movement-in');
    expect(result.sourceMovement.quantity).toBe(-3);
    expect(result.destinationMovement.quantity).toBe(3);
    expect(result.sourceMovement.transfer_group_id).toBe(result.transferGroupId);
    expect(result.destinationMovement.transfer_group_id).toBe(result.transferGroupId);

    const calls = client.query.mock.calls as unknown as [string, unknown[]?][];
    const locks = calls.filter(([sql]) => sql.includes('FOR UPDATE'));
    expect(locks).toHaveLength(2);
    expect(locks[0][1]?.[1]).toBe('warehouse-a');
    expect(locks[1][1]?.[1]).toBe('warehouse-b');
    expect(calls.filter(([sql]) => sql.includes('UPDATE inventory_stock_levels SET quantity=quantity-'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('UPDATE inventory_stock_levels SET quantity=quantity+'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO inventory_stock_movements'))).toHaveLength(2);
    expect(calls.some(([sql, params]) => sql.includes('UPDATE products SET stock_quantity') && params?.[0] === 'company-1')).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-1',
      action: 'inventory.stock.transfer',
      entityId: result.transferGroupId,
    }));
  });

  it('rejects a transfer that would consume reserved stock without writing movements', async () => {
    const client = { query: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id,is_service FROM products')) return { rows: [{ id: 'product-1', is_service: false }], rowCount: 1 };
      if (sql.includes('SELECT id FROM warehouses')) return { rows: [{ id: 'warehouse' }], rowCount: 1 };
      if (sql.includes('SELECT quantity,reserved_quantity FROM inventory_stock_levels')) return { rows: [{ quantity: '5', reserved_quantity: '4' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }) };
    db.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback(client));

    await expect(service.transfer(user, {
      productId: 'product-1',
      sourceWarehouseId: 'warehouse-a',
      destinationWarehouseId: 'warehouse-b',
      quantity: 2,
    })).rejects.toThrow(BadRequestException);

    const calls = client.query.mock.calls as unknown as [string, unknown[]?][];
    expect(calls.some(([sql]) => sql.includes('UPDATE inventory_stock_levels'))).toBe(false);
    expect(calls.some(([sql]) => sql.includes('INSERT INTO inventory_stock_movements'))).toBe(false);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects a transfer between the same warehouse before opening a transaction', async () => {
    await expect(service.transfer(user, {
      productId: 'product-1',
      sourceWarehouseId: 'warehouse-a',
      destinationWarehouseId: 'warehouse-a',
      quantity: 1,
    })).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
