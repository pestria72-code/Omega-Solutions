import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  private readonly preferenceKeys = new Set([
    'emailSecurity', 'emailUpdates', 'emailMarketing', 'pushMessages', 'pushMentions',
    'pushTasks', 'emailFrequency', 'quietHoursStart', 'quietHoursEnd', 'channelEmail',
    'channelPush', 'channelSms', 'orderUpdatesEmail', 'orderUpdatesBrowser',
    'orderUpdatesApp', 'invoiceRemindersEmail', 'invoiceRemindersBrowser',
    'invoiceRemindersApp', 'promotionalOffersEmail', 'promotionalOffersBrowser',
    'promotionalOffersApp', 'systemMaintenanceEmail', 'systemMaintenanceBrowser',
    'systemMaintenanceApp', 'notificationTiming',
  ]);

  async getPreferences(user: AuthenticatedUser) {
    if (!user.companyId) return { preferences: null };
    const result = await this.db.query<{ preferences: Record<string, unknown> }>(
      `SELECT preferences FROM notification_preferences
       WHERE company_id = $1 AND user_id = $2 LIMIT 1`,
      [user.companyId, user.userId],
    );
    return { preferences: result.rows[0]?.preferences ?? null };
  }

  async savePreferences(user: AuthenticatedUser, input: unknown) {
    if (!user.companyId) return { success: false, message: 'Your account is not assigned to a company.' };
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { success: false, message: 'Invalid notification preferences.' };
    }
    const preferences: Record<string, boolean | string> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!this.preferenceKeys.has(key)) continue;
      if (typeof value !== 'boolean' && typeof value !== 'string') {
        return { success: false, message: `Invalid value for ${key}.` };
      }
      if (typeof value === 'string' && value.length > 40) {
        return { success: false, message: `Invalid value for ${key}.` };
      }
      preferences[key] = value;
    }
    if (Object.keys(preferences).length !== this.preferenceKeys.size) {
      return { success: false, message: 'Some notification preferences are missing.' };
    }
    await this.db.query(
      `INSERT INTO notification_preferences (company_id, user_id, preferences, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (company_id, user_id)
       DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()`,
      [user.companyId, user.userId, JSON.stringify(preferences)],
    );
    return { success: true, preferences };
  }

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
