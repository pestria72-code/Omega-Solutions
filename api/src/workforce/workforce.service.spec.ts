import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WorkforceService } from './workforce.service.js';

describe('WorkforceService validation and attendance', () => {
  let db: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let memberships: { getMembership: ReturnType<typeof vi.fn>; getMembershipForCompany: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: WorkforceService;
  const user = { userId: 'user-a', email: 'a@example.test', fullName: 'A', companyId: 'company-a', branchId: null, role: 'owner', permissions: [] };

  beforeEach(() => {
    db = { query: vi.fn(), transaction: vi.fn() };
    memberships = { getMembership: vi.fn(), getMembershipForCompany: vi.fn().mockResolvedValue({ companyId: 'company-a', branchId: null, role: 'owner' }) };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    service = new WorkforceService(db as never, memberships as never, audit as never);
  });

  it('rejects invalid date filters before querying attendance', async () => {
    await expect(service.attendance(user, 'not-a-date')).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects impossible calendar dates before querying attendance', async () => {
    await expect(service.attendance(user, '2026-02-30')).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects invalid punch type before opening a transaction', async () => {
    await expect(service.punch(user, { employeeId: 'employee-a', punchType: 'break' })).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects a timestamp too far in the future before opening a transaction', async () => {
    await expect(service.punch(user, { employeeId: 'employee-a', punchType: 'in', punchedAt: '2099-01-01T00:00:00Z' })).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects transfers after the current assignment end date', async () => {
    const client = { query: vi.fn().mockResolvedValueOnce({ rows: [{ start_date: '2026-10-01', end_date: '2026-10-10' }] }) };
    db.transaction.mockImplementation(async (work: (connection: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) => work(client));
    await expect(service.transfer(user, 'assignment-a', { effectiveDate: '2026-10-11', siteId: 'site-b', payBasis: 'monthly', payRate: 1000 })).rejects.toThrow(BadRequestException);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('requires a valid pay basis before opening an assignment transaction', async () => {
    await expect(service.createAssignment(user, { employeeId: 'employee-a', siteId: 'site-a', startDate: '2026-10-15', payBasis: 'weekly', payRate: 1000 })).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
