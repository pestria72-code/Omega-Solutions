import { BadRequestException } from '@nestjs/common';
import { CreditNotesService } from './credit-notes.service.js';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

const user: AuthenticatedUser = {
  userId: 'user-a', email: 'a@example.test', fullName: 'User A',
  companyId: 'company-a', branchId: null, role: 'owner',
  permissions: ['credit-notes:read', 'credit-notes:write'],
};

describe('CreditNotesService', () => {
  it('scopes credit note listing to the authenticated company', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'cn-a', company_id: 'company-a' }], rowCount: 1 }) };
    const memberships = { getMembershipForCompany: vi.fn().mockResolvedValue({ companyId: 'company-a', branchId: null, role: 'owner' }), getMembership: vi.fn() };
    const service = new CreditNotesService(
      db as unknown as DatabaseService,
      memberships as unknown as MembershipsService,
      { log: vi.fn() } as unknown as AuditService,
      { ensureDefaults: vi.fn() } as unknown as AccountingService,
    );

    const result = await service.list(user);

    expect(result).toHaveLength(1);
    expect(db.query.mock.calls[0][0]).toContain('WHERE cn.company_id=$1');
    expect(db.query.mock.calls[0][1]).toEqual(['company-a']);
    expect(memberships.getMembershipForCompany).toHaveBeenCalledWith('user-a', 'company-a');
  });

  it('rejects credits that exceed the remaining unpaid balance before inserting a note or journal', async () => {
    const client = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{
          id: 'invoice-a', customer_id: 'customer-a', invoice_number: 'INV-2026-00001',
          issue_date: '2026-10-01', status: 'sent', total: '100.00',
          amount_paid: '60.00', credited_amount: '10.00',
        }], rowCount: 1,
      }),
    };
    const db = {
      query: vi.fn(),
      transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(client)),
    };
    const memberships = { getMembershipForCompany: vi.fn().mockResolvedValue({ companyId: 'company-a', branchId: null, role: 'owner' }), getMembership: vi.fn() };
    const accounting = { ensureDefaults: vi.fn().mockResolvedValue(undefined) };
    const service = new CreditNotesService(
      db as unknown as DatabaseService,
      memberships as unknown as MembershipsService,
      { log: vi.fn() } as unknown as AuditService,
      accounting as unknown as AccountingService,
    );

    await expect(service.create(user, {
      invoiceId: 'invoice-a',
      issueDate: '2026-10-17',
      reason: 'Price correction',
      items: [{ description: 'Credit adjustment', quantity: 1, unitPrice: 30, taxRate: 10 }],
    })).rejects.toThrow(BadRequestException);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][1]).toEqual(['invoice-a', 'company-a']);
  });
});
