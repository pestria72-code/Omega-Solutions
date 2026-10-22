import { describe, expect, it, vi } from 'vitest';
import { calculateRemittanceDueDate, PayrollRemittancesService } from './payroll-remittances.service.js';

const user = {
  userId: 'user-a', email: 'a@example.test', fullName: 'A',
  companyId: null, branchId: null, role: 'owner', permissions: [],
};

type MockClient = { query: ReturnType<typeof vi.fn> };

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

  it('calculates the 9th of the following month for PAYE, NSSF and SHIF', () => {
    expect(calculateRemittanceDueDate('PAYE', '2026-10-31')).toBe('2026-11-09');
    expect(calculateRemittanceDueDate('NSSF', '2026-10-31')).toBe('2026-11-09');
    expect(calculateRemittanceDueDate('SHIF', '2026-10-31')).toBe('2026-11-09');
  });

  it('calculates the ninth weekday after month-end for housing levy', () => {
    expect(calculateRemittanceDueDate('HOUSING_LEVY', '2026-10-31')).toBe('2026-11-12');
  });

  it('rejects invalid payroll period end dates', () => {
    expect(() => calculateRemittanceDueDate('PAYE', 'not-a-date')).toThrow('valid calendar date');
  });

  it('does not generate obligations from a draft payroll run', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'run-a', status: 'draft' }] }) };
    const db = { query: vi.fn(), transaction: vi.fn(async (callback: (client: MockClient) => unknown) => callback(client)) } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.generateForRun(user, 'run-a')).rejects.toThrow('only be generated from a posted payroll run');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects payments above the tenant-scoped outstanding balance', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'obligation-a', amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ amount_paid: '75.00' }] }),
    };
    const db = { query: vi.fn(), transaction: vi.fn(async (callback: (client: MockClient) => unknown) => callback(client)) } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.recordPayment(user, 'obligation-a', {
      amount: 30, paymentReference: 'MPESA-REF-1',
    })).rejects.toThrow('exceeds the outstanding obligation balance');
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][1]).toEqual(['obligation-a', 'company-a']);
  });

  it('accepts ordinary two-decimal amounts without floating-point false rejection', async () => {
    const client: MockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'obligation-a', amount: '1.00' }] })
        .mockResolvedValueOnce({ rows: [{ amount_paid: '0.00' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-a', amount: '0.29', payment_reference: 'MPESA-REF-29' }] }),
    };
    const db = { query: vi.fn(), transaction: vi.fn(async (callback: (client: MockClient) => unknown) => callback(client)) } as never;
    const memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-a' }) } as never;
    const service = new PayrollRemittancesService(db, memberships);
    const result = await service.recordPayment(user, 'obligation-a', { amount: 0.29, paymentReference: 'MPESA-REF-29' });
    expect(result.verificationStatus).toBe('recorded_not_independently_verified');
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('requires a non-empty payment reference', async () => {
    const db = { query: vi.fn(), transaction: vi.fn() } as never;
    const memberships = { getMembership: vi.fn() } as never;
    const service = new PayrollRemittancesService(db, memberships);
    await expect(service.recordPayment(user, 'obligation-a', { amount: 1, paymentReference: '  ' })).rejects.toThrow('paymentReference is required');
    expect((db as { transaction: ReturnType<typeof vi.fn> }).transaction).not.toHaveBeenCalled();
  });
});
