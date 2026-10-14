import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ProductsService } from './products.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ProductsService initial stock', () => {
  let service: ProductsService;
  let db: { query: Mock; transaction: Mock };
  let memberships: { getMembership: Mock };
  let audit: { log: Mock };
  let client: { query: Mock };

  const user = { userId: 'user-1' } as any;
  const dto = {
    sku: 'TEST-001',
    name: 'Test product',
    sellingPrice: 150,
    costPrice: 80,
    stockQuantity: 5,
    reorderLevel: 2,
  };

  beforeEach(async () => {
    client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT id FROM products WHERE company_id')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('INSERT INTO products')) {
          return {
            rows: [{
              id: 'product-1',
              company_id: 'company-1',
              sku: dto.sku,
              name: dto.name,
              stock_quantity: params?.[8] ?? 0,
              is_service: params?.[10] ?? false,
            }],
            rowCount: 1,
          };
        }
        if (sql.includes('SELECT id FROM warehouses')) {
          return { rows: [{ id: 'warehouse-1' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO inventory_stock_movements')) {
          return { rows: [{ id: 'movement-1' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };
    db = {
      query: vi.fn(),
      transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(client)),
    };
    memberships = {
      getMembership: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: DatabaseService, useValue: db },
        { provide: MembershipsService, useValue: memberships },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('records positive initial stock in the stock ledger and opening-balance movement in one transaction', async () => {
    await service.create(user, dto as any);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO inventory_stock_levels'),
      ['company-1', 'warehouse-1', 'product-1', 5, 2],
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("'opening_balance'"),
      ['company-1', 'product-1', 'warehouse-1', 5, 80, 'Initial stock entered when the product was created.', 'user-1'],
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'product.create',
      entityId: 'product-1',
      newValues: { name: dto.name, sku: dto.sku, initialStock: 5 },
    }));
  });

  it('rejects initial stock for a service before opening a transaction', async () => {
    await expect(service.create(user, { ...dto, isService: true } as any)).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not create stock rows or movements when initial stock is zero', async () => {
    await service.create(user, { ...dto, stockQuantity: 0 } as any);

    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('inventory_stock_levels'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('inventory_stock_movements'))).toBe(false);
  });
});
