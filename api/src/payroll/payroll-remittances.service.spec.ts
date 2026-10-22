import { describe, expect, it, vi } from 'vitest';
import { PayrollRemittancesService } from './payroll-remittances.service.js';

const user = {
  userId: 'user-a', email: 'a@example.test', fullName: 'A',
  companyId: null, branchId: null, role: 'owner', permissions: [],
};

describe('PayrollRemittancesService', () => {
  it('lists obligations only for the active company', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }), transaction: vi.fn() } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await service.list(user);
    const query = (db as { query: ReturnType<typeof vi.fn> }).query;
    expect(query.mock.calls[0][1]).toEqual(['company-a']);
    expect(query.mock.calls[0][0]).toContain('WHERE o.company_id=$1');
    expect(query.mock.calls[0][0]).toContain('payroll_remittance_payments');
  });

  it('rejects an invalid due date before opening a transaction', async () => {
    const db = { query: vi.fn(), transaction: vi.fn() } as never;
    const memberships = { getMembership: vi.fn() } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.generateForRun(user, 'run-a', 'not-a-date')).rejects.toThrow('valid YYYY-MM-DD');
    expect((db as { transaction: ReturnType<typeof vi.fn> }).transaction).not.toHaveBeenCalled();
  });

  it('does not generate obligations from a draft payroll run', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'run-a', status: 'draft' }] }) };
    const db = { query: vi.fn(), transaction: vi.fn(async (callback: (client: typeof client) => unknown) => callback(client)) } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.generateForRun(user, 'run-a', '2026-11-09')).rejects.toThrow('only be generated from a posted payroll run');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects payments above the tenant-scoped outstanding balance', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'obligation-a', amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ amount_paid: '75.00' }] }),
    };
    const db = { query: vi.fn(), transaction: vi.fn(async (callback: (client: typeof client) => unknown) => callback(client)) } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.recordPayment(user, 'obligation-a', {
      amount: 30, paymentReference: 'MPESA-REF-1',
    })).rejects.toThrow('exceeds the outstanding obligation balance');
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][1]).toEqual(['obligation-a', 'company-a']);
  });

  it('requires a non-empty payment reference', async () => {
    const db = { query: vi.fn(), transaction: vi.fn() } as never;
    const memberships = { getMembership: vi.fn() } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.recordPayment(user, 'obligation-a', { amount: 1, paymentReference: '  ' })).rejects.toThrow('paymentReference is required');
    expect((db as { transaction: ReturnType<typeof vi.fn> }).transaction).not.toHaveBeenCalled();
  });
});
