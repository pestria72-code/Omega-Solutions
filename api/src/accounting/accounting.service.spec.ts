import { AccountingService } from './accounting.service.js';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

describe('AccountingService receivables reconciliation', () => {
  const user: AuthenticatedUser = {
    userId: 'user-1', email: 'owner@example.test', fullName: 'Test Owner',
    companyId: 'company-active', branchId: null, role: 'owner', permissions: ['accounting:read'],
  };
  let db: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let memberships: { getMembership: ReturnType<typeof vi.fn>; getMembershipForCompany: ReturnType<typeof vi.fn> };
  let service: AccountingService;

  beforeEach(() => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    db = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ balance: '100.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ balance: '80.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ current: '30.00', days_1_to_30: '20.00', days_31_to_60: '20.00', days_61_plus: '10.00' }], rowCount: 1 }),
      transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(client)),
    };
    const membership = { companyId: 'company-active', branchId: null, role: 'owner' };
    memberships = {
      getMembership: vi.fn().mockResolvedValue({ companyId: 'company-default', branchId: null, role: 'owner' }),
      getMembershipForCompany: vi.fn().mockResolvedValue(membership),
    };
    service = new AccountingService(
      db as unknown as DatabaseService,
      memberships as unknown as MembershipsService,
      { log: vi.fn() } as unknown as AuditService,
    );
  });

  it('compares the active company AR control balance with open invoices and reports ageing', async () => {
    const result = await service.receivablesReconciliation(user);

    expect(memberships.getMembershipForCompany).toHaveBeenCalledWith('user-1', 'company-active');
    expect(memberships.getMembership).not.toHaveBeenCalled();
    expect(result.controlAccountBalance).toBe(100);
    expect(result.customerInvoicesBalance).toBe(80);
    expect(result.variance).toBe(20);
    expect(result.reconciled).toBe(false);
    expect(result.ageing).toEqual({ current: 30, days1to30: 20, days31to60: 20, days61plus: 10 });
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(db.query.mock.calls[1][0]).toContain("i.status NOT IN ('draft','cancelled')");
    const calls = db.query.mock.calls as unknown as [string, unknown[]][];
    expect(calls.every((call) => call[1]?.[0] === 'company-active')).toBe(true);
  });

  it('marks the receivables ledger reconciled when the variance is within one cent', async () => {
    db.query
      .mockReset()
      .mockResolvedValueOnce({ rows: [{ balance: '80.00' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ balance: '80.01' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current: '80.01', days_1_to_30: '0', days_31_to_60: '0', days_61_plus: '0' }], rowCount: 1 });

    const result = await service.receivablesReconciliation(user);

    expect(result.variance).toBe(-0.01);
    expect(result.reconciled).toBe(true);
  });
});
