import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async list(user: AuthenticatedUser) {
    if (!user.companyId) return { items: [], unreadCount: 0 };
    const result = await this.db.query(
      `SELECT id, title, message, href, notification_type, read_at, created_at
       FROM notifications
       WHERE company_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.companyId, user.userId],
    );
    const unread = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications
       WHERE company_id = $1 AND user_id = $2 AND read_at IS NULL`,
      [user.companyId, user.userId],
    );
    return { items: result.rows, unreadCount: Number(unread.rows[0]?.count ?? 0) };
  }

  async markRead(user: AuthenticatedUser, id: string) {
    if (!user.companyId) return { success: false };
    const result = await this.db.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND company_id = $2 AND user_id = $3
       RETURNING id, read_at`,
      [id, user.companyId, user.userId],
    );
    return result.rows[0] ?? { success: false };
  }

  async markAllRead(user: AuthenticatedUser) {
    if (!user.companyId) return { updated: 0 };
    const result = await this.db.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE company_id = $1 AND user_id = $2 AND read_at IS NULL`,
      [user.companyId, user.userId],
    );
    return { updated: result.rowCount ?? 0 };
  }
}
