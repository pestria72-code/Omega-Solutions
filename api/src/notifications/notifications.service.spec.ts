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
});
