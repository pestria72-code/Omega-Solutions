import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService) {}

  async getSummary(user: AuthenticatedUser) {
    const membership = await this.memberships.getMembership(user.userId);
    const company = await this.db.query<{ id: string; name: string; currency: string }>(
      'SELECT id, name, currency FROM companies WHERE id = $1 AND is_active = true',
      [membership.companyId],
    );
    if (!company.rows[0]) return { company: null, recordsByTable: {}, generatedAt: new Date().toISOString() };

    const tables = await this.db.query<{ table_name: string }>(
      "SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name WHERE c.table_schema = 'public' AND c.column_name = 'company_id' AND t.table_type = 'BASE TABLE' AND c.table_name NOT IN ('companies') GROUP BY c.table_name ORDER BY c.table_name",
    );
    const recordsByTable: Record<string, number> = {};
    for (const row of tables.rows) {
      const tableName = '"' + row.table_name.replace(/"/g, '""') + '"';
      const result = await this.db.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM public.' + tableName + ' WHERE company_id::text = $1::text',
        [membership.companyId],
      );
      recordsByTable[row.table_name] = Number(result.rows[0]?.count ?? 0);
    }
    return { company: company.rows[0], recordsByTable, generatedAt: new Date().toISOString() };
  }
}
