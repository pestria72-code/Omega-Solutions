import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import type { DatabaseService } from '../database.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

const user = (userId = 'user-a', companyId: string | null = 'company-a'): AuthenticatedUser => ({
  userId, email: 'user@example.test', fullName: 'User', companyId,
  branchId: null, role: 'staff', permissions: [],
});

describe('NotificationsService', () => {
  const db = { query: vi.fn() };
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(db as unknown as DatabaseService);
  });

  it('returns persisted notifications and unread count scoped to company and recipient', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'n1', read_at: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
    const result = await service.list(user());
    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(db.query.mock.calls[0][1]).toEqual(['company-a', 'user-a']);
    expect(db.query.mock.calls[1][1]).toEqual(['company-a', 'user-a']);
  });

  it('does not query the database when no company is active', async () => {
    expect(await service.list(user('user-a', null))).toEqual({ items: [], unreadCount: 0 });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('marks a notification read only for its owning company and recipient', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'n1' }], rowCount: 1 });
    await service.markRead(user('user-a', 'company-a'), 'n1');
    expect(db.query.mock.calls[0][0]).toContain('WHERE id = $1 AND company_id = $2 AND user_id = $3');
    expect(db.query.mock.calls[0][1]).toEqual(['n1', 'company-a', 'user-a']);
  });

  it('marks all unread notifications read only for the active recipient', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 2 });
    expect(await service.markAllRead(user())).toEqual({ updated: 2 });
    expect(db.query.mock.calls[0][1]).toEqual(['company-a', 'user-a']);
  });
  it('loads saved preferences scoped to the active company and user', async () => {
    const preferences = { emailSecurity: true };
    db.query.mockResolvedValueOnce({ rows: [{ preferences }], rowCount: 1 });
    expect(await service.getPreferences(user())).toEqual({ preferences });
    expect(db.query.mock.calls[0][1]).toEqual(['company-a', 'user-a']);
  });

  it('does not read preferences without an active company', async () => {
    expect(await service.getPreferences(user('user-a', null))).toEqual({ preferences: null });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('saves the complete preference set with company and user isolation', async () => {
    const preferences = {
      emailSecurity: true, emailUpdates: true, emailMarketing: false,
      pushMessages: true, pushMentions: true, pushTasks: false,
      emailFrequency: 'instant', quietHoursStart: '22:00', quietHoursEnd: '06:00',
      channelEmail: true, channelPush: true, channelSms: false,
      orderUpdatesEmail: true, orderUpdatesBrowser: true, orderUpdatesApp: true,
      invoiceRemindersEmail: true, invoiceRemindersBrowser: false, invoiceRemindersApp: true,
      promotionalOffersEmail: false, promotionalOffersBrowser: true, promotionalOffersApp: false,
      systemMaintenanceEmail: true, systemMaintenanceBrowser: true, systemMaintenanceApp: false,
      notificationTiming: 'online',
    };
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await service.savePreferences(user(), preferences)).toEqual({ success: true, preferences });
    expect(db.query.mock.calls[0][1]).toEqual(['company-a', 'user-a', JSON.stringify(preferences)]);
    expect(db.query.mock.calls[0][0]).toContain('ON CONFLICT (company_id, user_id)');
  });

  it('rejects incomplete preferences without writing to the database', async () => {
    expect(await service.savePreferences(user(), { emailSecurity: true })).toEqual({
      success: false, message: 'Some notification preferences are missing.',
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects invalid preference values without writing to the database', async () => {
    expect(await service.savePreferences(user(), { emailSecurity: 'yes' })).toEqual({
      success: false, message: 'Invalid value for emailSecurity.',
    });
    expect(db.query).not.toHaveBeenCalled();
  });

});