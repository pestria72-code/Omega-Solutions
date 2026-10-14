import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';
import type { DatabaseService } from '../database.service.js';
import type { MembershipsService } from '../memberships/memberships.service.js';

describe('DashboardService', () => {
  const query = vi.fn();
  const getMembership = vi.fn();
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardService(
      { query } as unknown as DatabaseService,
      { getMembership } as unknown as MembershipsService,
    );
    getMembership.mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' });
  });

  it('returns live company details and counts scoped to the member company', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ id: 'company-1', name: 'Acme Ltd', currency: 'KES' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ table_name: 'invoices' }, { table_name: 'company_memberships' }],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

    const result = await service.getSummary({
      userId: 'user-1',
      email: 'owner@example.com',
      fullName: 'Company Owner',
      companyId: null,
      branchId: null,
      role: 'owner',
      permissions: [],
    });

    expect(getMembership).toHaveBeenCalledWith('user-1');
    expect(result.company).toEqual({ id: 'company-1', name: 'Acme Ltd', currency: 'KES' });
    expect(result.recordsByTable).toEqual({ invoices: 3, company_memberships: 1 });
    expect(result.generatedAt).toBeTruthy();
    expect(query.mock.calls[2][0]).toContain('company_id::text = $1::text');
    expect(query.mock.calls[2][1]).toEqual(['company-1']);
    expect(query.mock.calls[3][1]).toEqual(['company-1']);
  });

  it('returns an empty summary when the member company is inactive or missing', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await service.getSummary({
      userId: 'user-1',
      email: 'owner@example.com',
      fullName: 'Company Owner',
      companyId: null,
      branchId: null,
      role: 'owner',
      permissions: [],
    });

    expect(result.company).toBeNull();
    expect(result.recordsByTable).toEqual({});
    expect(query).toHaveBeenCalledTimes(1);
  });
});
