import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

export interface DashboardSummary {
  company: { id: string; name: string; currency: string } | null;
  counts: { branches: number };
  generatedAt: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
  ) {}

  async getSummary(user: AuthenticatedUser): Promise<DashboardSummary> {
    // Membership is resolved from the verified user identity, never from request input.
    const membership = await this.memberships.getMembership(user.userId);
    try {
      const companyResult = await this.db.query<{
        id: string;
        name: string;
        currency: string;
      }>(
        'SELECT id, name, currency FROM companies WHERE id = $1 AND is_active = true',
        [membership.companyId],
      );
      const company = companyResult.rows[0] ?? null;
      if (!company) {
        return {
          company: null,
          counts: { branches: 0 },
          generatedAt: new Date().toISOString(),
        };
      }

      // Only count a verified, user-facing business entity. Never infer metrics
      // from arbitrary tables or expose membership, permission, user, or audit rows.
      const branchResult = membership.branchId
        ? await this.db.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM branches WHERE company_id = $1 AND id = $2 AND is_active = true',
            [membership.companyId, membership.branchId],
          )
        : await this.db.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM branches WHERE company_id = $1 AND is_active = true',
            [membership.companyId],
          );

      return {
        company,
        counts: { branches: Number(branchResult.rows[0]?.count ?? 0) },
        generatedAt: new Date().toISOString(),
      };
    } catch {
      // Keep SQL errors and schema details out of the public API response.
      throw new ServiceUnavailableException('Dashboard data is temporarily unavailable.');
    }
  }
}
