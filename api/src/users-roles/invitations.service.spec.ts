import { ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InvitationsService } from './invitations.service.js';

describe('InvitationsService', () => {
  const user = { userId: 'owner-1', email: 'owner@example.com', companyId: 'company-1', branchId: null, role: 'owner' } as any;
  let db: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let client: { query: ReturnType<typeof vi.fn> };
  let memberships: { requireOwnerOrAdmin: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: InvitationsService;

  beforeEach(() => {
    client = { query: vi.fn() };
    db = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      transaction: vi.fn((callback: (client: typeof client) => Promise<unknown>) => callback(client)),
    };
    memberships = {
      requireOwnerOrAdmin: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    service = new InvitationsService(db as any, memberships as any, audit as any);
  });

  it('does not allow an admin to invite another admin', async () => {
    memberships.requireOwnerOrAdmin.mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'admin' });
    await expect(service.create(user, { email: 'new@example.com', role: 'admin' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('fails closed when delivery is not configured', async () => {
    const old = {
      key: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      base: process.env.APP_BASE_URL,
    };
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.APP_BASE_URL;
    try {
      await expect(service.create(user, { email: 'new@example.com', role: 'staff' })).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(db.query).not.toHaveBeenCalled();
    } finally {
      if (old.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old.key;
      if (old.from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = old.from;
      if (old.base === undefined) delete process.env.APP_BASE_URL; else process.env.APP_BASE_URL = old.base;
    }
  });

  it('lists invitations only for the authenticated company', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'invite-1' }], rowCount: 1 });
    const result = await service.list(user);
    expect(result).toEqual([{ id: 'invite-1' }]);
    expect(db.query.mock.calls[0][1]).toEqual(['company-1']);
    expect(db.query.mock.calls[0][0]).toContain('WHERE i.company_id = $1');
  });

  it('rejects an invalid or expired token without creating a membership', async () => {
    client.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(service.accept(user, 'invalid-token')).rejects.toBeInstanceOf(NotFoundException);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(audit.log).not.toHaveBeenCalled();
  });
  it('rejects acceptance when the signed-in email does not match the invitation', async () => {
    client.query.mockResolvedValueOnce({
      rows: [{ id: 'invite-1', company_id: 'company-2', email: 'intended@example.com', role: 'staff', branch_id: null }],
      rowCount: 1,
    });
    const invitee = { userId: 'invitee-1', email: 'other@example.com', companyId: 'company-1' } as any;

    await expect(service.accept(invitee, 'one-time-token')).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('creates a company-scoped membership and consumes a valid invitation atomically', async () => {
    client.query
      .mockResolvedValueOnce({
        rows: [{ id: 'invite-1', company_id: 'company-2', email: 'new@example.com', role: 'staff', branch_id: 'branch-2' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'branch-2' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'membership-new' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const invitee = { userId: 'invitee-1', email: 'new@example.com', companyId: 'company-1' } as any;

    const result = await service.accept(invitee, 'one-time-token');

    expect(result).toEqual({ success: true, companyId: 'company-2', role: 'staff' });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[1][1]).toEqual(['invitee-1', 'company-2']);
    expect(client.query.mock.calls[2][1]).toEqual(['branch-2', 'company-2']);
    expect(client.query.mock.calls[3][0]).toContain('INSERT INTO company_memberships');
    expect(client.query.mock.calls[3][1]).toEqual(['invitee-1', 'company-2', 'branch-2', 'staff']);
    expect(client.query.mock.calls[4][0]).toContain('SET accepted_at = NOW()');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'accept_invitation',
      companyId: 'company-2',
      entityId: 'invite-1',
    }));
  });

  it('does not create a second membership if the invitee already belongs to the invited company', async () => {
    client.query
      .mockResolvedValueOnce({
        rows: [{ id: 'invite-1', company_id: 'company-2', email: 'new@example.com', role: 'staff', branch_id: null }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ id: 'membership-existing' }], rowCount: 1 });
    const invitee = { userId: 'invitee-1', email: 'new@example.com', companyId: 'company-1' } as any;

    await expect(service.accept(invitee, 'one-time-token')).rejects.toBeInstanceOf(ConflictException);
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('revokes a newly-created invitation when the email provider rejects delivery', async () => {
    const oldEnv = {
      key: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      base: process.env.APP_BASE_URL,
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.EMAIL_FROM = 'Omega Solutions <no-reply@example.test>';
    process.env.APP_BASE_URL = 'https://omega.example.test';
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'invite-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ name: 'Test Company' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    try {
      await expect(service.create(user, { email: 'new@example.com', role: 'staff' }))
        .rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(db.query.mock.calls[2][0]).toContain('INSERT INTO company_invitations');
      expect(db.query.mock.calls[2][1][5]).toMatch(/^[a-f0-9]{64}$/);
      const emailPayload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
      expect(emailPayload.text).toContain('https://omega.example.test/accept-invitation?token=');
      expect(emailPayload.text).not.toContain(String(db.query.mock.calls[2][1][5]));
      expect(db.query.mock.calls[4][0]).toContain('SET revoked_at = NOW()');
      expect(audit.log).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      if (oldEnv.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldEnv.key;
      if (oldEnv.from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = oldEnv.from;
      if (oldEnv.base === undefined) delete process.env.APP_BASE_URL; else process.env.APP_BASE_URL = oldEnv.base;
    }
  });

});
