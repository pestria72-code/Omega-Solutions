import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { PosService } from './pos.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('PosService', () => {
  let service: PosService;
  let db: { query: Mock; transaction: Mock };
  let memberships: { getMembership: Mock; getMembershipForCompany: Mock };
  let audit: { log: Mock };
  let accounting: { ensureDefaults: Mock };
  const user = { userId: 'cashier-1', companyId: 'company-1' } as any;

  beforeEach(async () => {
    db = { query: vi.fn(), transaction: vi.fn() };
    memberships = {
      getMembership: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }),
      getMembershipForCompany: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    accounting = { ensureDefaults: vi.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: DatabaseService, useValue: db },
        { provide: MembershipsService, useValue: memberships },
        { provide: AuditService, useValue: audit },
        { provide: AccountingService, useValue: accounting },
      ],
    }).compile();
    service = module.get(PosService);
  });

  it('searches active products within the selected company and warehouse', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'product-1', sku: 'SKU-1' }], rowCount: 1 });
    const result = await service.searchProducts(user, 'tea', 'warehouse-1');
    expect(result).toHaveLength(1);
    expect(db.query.mock.calls[0][0]).toContain('p.company_id=$1');
    expect(db.query.mock.calls[0][0]).toContain('s.warehouse_id=$2::uuid');
    expect(db.query.mock.calls[0][1]).toEqual(['company-1', 'warehouse-1', '%tea%']);
  });

  it('keeps the current shift lookup company- and cashier-scoped', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await service.currentShift(user)).toBeNull();
    expect(db.query.mock.calls[0][0]).toContain('s.company_id=$1');
    expect(db.query.mock.calls[0][0]).toContain('s.opened_by=$2');
    expect(db.query.mock.calls[0][1]).toEqual(['company-1', 'cashier-1']);
  });

  it('calculates cash-up only from confirmed cash payments linked to this exact shift', async () => {
    const client = { query: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id,opened_by,opening_float,status,register_id')) return { rows: [{ id: 'shift-1', opened_by: 'cashier-1', opening_float: '100.00', status: 'open', register_id: 'register-1' }], rowCount: 1 };
      if (sql.includes('SUM(amount)') && sql.includes('pos_shift_id=$2')) return { rows: [{ total: '25.50' }], rowCount: 1 };
      if (sql.includes('UPDATE pos_shifts SET status')) return { rows: [{ id: 'shift-1', status: 'closed', expected_cash: '125.50', counted_cash: '130.00', cash_difference: '4.50' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }) };
    db.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback(client));
    const result = await service.closeShift(user, 'shift-1', { countedCash: 130 });
    expect(result.expected_cash).toBe('125.50');
    expect(result.cash_difference).toBe('4.50');
    const cashCall = client.query.mock.calls.find(([sql]) => String(sql).includes('pos_shift_id=$2'));
    expect(cashCall?.[1]).toEqual(['company-1', 'shift-1']);
    expect(String(cashCall?.[0])).toContain("status IN ('confirmed','reconciled')");
    expect(String(cashCall?.[0])).toContain("method='cash'");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'pos.shift.close', entityId: 'shift-1' }));
  });

  it('rejects a negative opening float before any database write', async () => {
    await expect(service.openShift(user, { registerId: 'register-1', openingFloat: -1 })).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
