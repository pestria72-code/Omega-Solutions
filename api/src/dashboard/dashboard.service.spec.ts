import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import type { DatabaseService } from '../database.service.js';
import type { MembershipsService } from '../memberships/memberships.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

describe('DashboardService', () => {
  const query = vi.fn();
  const getMembership = vi.fn();
  let service: DashboardService;
  const user: AuthenticatedUser = {
    userId: 'user-1',
    email: 'owner@example.com',
    fullName: 'Company Owner',
    companyId: 'untrusted-token-company',
    branchId: null,
    role: 'owner',
    permissions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardService(
      { query } as unknown as DatabaseService,
      { getMembership } as unknown as MembershipsService,
    );
    getMembership.mockResolvedValue({ companyId: 'company-a', branchId: null, role: 'owner' });
    query.mockResolvedValueOnce({
      rows: [{ id: 'company-a', name: 'Acme Ltd', currency: 'KES' }],
      rowCount: 1,
    });
  });

  it('returns company details and active branch count scoped to server-resolved membership', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });

    const result = await service.getSummary(user);

    expect(getMembership).toHaveBeenCalledWith('user-1');
    expect(result.company).toEqual({ id: 'company-a', name: 'Acme Ltd', currency: 'KES' });
    expect(result.counts).toEqual({ branches: 3 });
    expect(query.mock.calls[0][1]).toEqual(['company-a']);
    expect(query.mock.calls[1][0]).toContain('FROM branches');
    expect(query.mock.calls[1][0]).toContain('company_id = $1');
    expect(query.mock.calls[1][1]).toEqual(['company-a']);
    expect(JSON.stringify(result)).not.toMatch(/membership|audit|permission|user/i);
  });

  it('does not trust the company id on the authenticated user object', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });
    await service.getSummary(user);
    expect(query.mock.calls[1][1]).toEqual(['company-a']);
    expect(query.mock.calls[1][1]).not.toContain('untrusted-token-company');
  });

  it('restricts branch-scoped memberships to their own active branch', async () => {
    getMembership.mockResolvedValue({ companyId: 'company-a', branchId: 'branch-a', role: 'manager' });
    query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

    const result = await service.getSummary(user);

    expect(result.counts.branches).toBe(1);
    expect(query.mock.calls[1][0]).toContain('id = $2');
    expect(query.mock.calls[1][1]).toEqual(['company-a', 'branch-a']);
  });

  it('rejects a user with no active company membership', async () => {
    getMembership.mockRejectedValue(new ForbiddenException('No active membership'));
    await expect(service.getSummary(user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns an empty company summary if the member company is inactive or missing', async () => {
    query.mockReset().mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await service.getSummary(user);
    expect(result.company).toBeNull();
    expect(result.counts).toEqual({ branches: 0 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns zero when a company has no active branches', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'company-a', name: 'Acme Ltd', currency: 'KES' }],
      rowCount: 1,
    }).mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    const result = await service.getSummary(user);
    expect(result.counts.branches).toBe(0);
  });

  it('hides database errors behind a safe service-unavailable response', async () => {
    query.mockReset().mockRejectedValue(new Error('private database host and query details'));
    await expect(service.getSummary(user)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.getSummary(user)).rejects.not.toThrow(/private database host/i);
  });
});
