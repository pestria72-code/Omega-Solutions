import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, QueryParams } from '../database.service.js';

export interface AuditEntry {
  userId: string | null;
  companyId: string | null;
  branchId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  async log(entry: AuditEntry): Promise<void> {
    const sql = `
      INSERT INTO audit_logs
        (user_id, company_id, branch_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const params: QueryParams = [
      entry.userId,
      entry.companyId,
      entry.branchId,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.ipAddress,
    ];

    try {
      await this.db.query(sql, params);
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for ${entry.action} (${entry.entityType}:${entry.entityId ?? 'unknown'}): ${err instanceof Error ? err.stack ?? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
