import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
});
