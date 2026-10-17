import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApprovalsService } from './approvals.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let db: { query: Mock; transaction: Mock };
  let client: { query: Mock };
  let memberships: { getMembership: Mock; getMembershipForCompany: Mock };
  let audit: { log: Mock };
  const user = { userId: 'approver-1', companyId: 'company-1', branchId: null } as any;

  beforeEach(async () => {
    client = { query: vi.fn() };
    db = {
      query: vi.fn(),
      transaction: vi.fn((callback: (client: typeof client) => Promise<unknown>) => callback(client)),
    };
    memberships = {
      getMembership: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'manager' }),
      getMembershipForCompany: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'manager' }),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: DatabaseService, useValue: db },
        { provide: MembershipsService, useValue: memberships },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ApprovalsService);
  });

  function pendingRequest(requester = 'requester-1') {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM approval_requests')) {
        return { rows: [{ id: 'approval-1', company_id: 'company-1', entity_type: 'requisition', entity_id: 'req-1', requester_user_id: requester, status: 'pending' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id,status FROM requisitions')) {
        return { rows: [{ id: 'req-1', status: 'pending_approval' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
  }

  it.each([
    ['approved', 'approve'],
    ['rejected', 'reject'],
  ] as const)('records a %s decision and transitions the requisition atomically', async (decision, action) => {
    pendingRequest();

    const result = await service.decide(user, 'approval-1', decision, 'Reviewed by manager');

    expect(result).toEqual({ id: 'approval-1', entityId: 'req-1', status: decision });
    const calls = client.query.mock.calls as unknown as [string, unknown[]?][];
    expect(calls[0][0]).toContain('WHERE company_id=$1 AND id=$2 FOR UPDATE');
    expect(calls[0][1]).toEqual(['company-1', 'approval-1']);
    expect(calls.some(([sql, params]) => sql.includes('UPDATE approval_requests') && params?.[0] === decision && params?.[1] === 'approver-1')).toBe(true);
    expect(calls.some(([sql, params]) => sql.includes('UPDATE requisitions') && params?.[0] === decision && params?.[1] === 'company-1' && params?.[2] === 'req-1')).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-1',
      action,
      entityType: 'approval_request',
      entityId: 'approval-1',
      newValues: { status: decision, entityId: 'req-1', note: 'Reviewed by manager' },
    }));
  });

  it('prevents the requester from approving their own request', async () => {
    pendingRequest(user.userId);

    await expect(service.decide(user, 'approval-1', 'approved')).rejects.toThrow(BadRequestException);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE approval_requests'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE requisitions'))).toBe(false);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects a decision when the approval belongs to another company', async () => {
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.decide(user, 'approval-from-other-company', 'approved')).rejects.toThrow(NotFoundException);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE company_id=$1 AND id=$2 FOR UPDATE'),
      ['company-1', 'approval-from-other-company'],
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects a second decision after the request has already been decided', async () => {
    client.query.mockResolvedValueOnce({ rows: [{ id: 'approval-1', status: 'approved' }], rowCount: 1 });

    await expect(service.decide(user, 'approval-1', 'rejected')).rejects.toThrow(BadRequestException);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE approval_requests'))).toBe(false);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects stale requests when the linked requisition is no longer pending approval', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM approval_requests')) {
        return { rows: [{ id: 'approval-1', entity_type: 'requisition', entity_id: 'req-1', requester_user_id: 'requester-1', status: 'pending' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id,status FROM requisitions')) {
        return { rows: [{ id: 'req-1', status: 'approved' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(service.decide(user, 'approval-1', 'rejected')).rejects.toThrow(BadRequestException);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE approval_requests'))).toBe(false);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not return approvals from another company in the inbox query', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await service.inbox(user);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE a.company_id=$1 AND a.status='pending'"),
      ['company-1', user.userId],
    );
  });
});
