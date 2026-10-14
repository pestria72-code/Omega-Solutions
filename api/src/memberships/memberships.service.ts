import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';

export interface MembershipInfo {
  companyId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class MembershipsService {
  constructor(private readonly db: DatabaseService) {}

  async getMembership(userId: string): Promise<MembershipInfo> {
    const result = await this.db.query<{ company_id: string; branch_id: string | null; role: string }>(
      `SELECT company_id, branch_id, role
       FROM company_memberships
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('You are not a member of any company.');
    }

    const m = result.rows[0];
    return {
      companyId: m.company_id,
      branchId: m.branch_id,
      role: m.role,
    };
  }

  async getMembershipForCompany(userId: string, companyId: string): Promise<MembershipInfo> {
    const result = await this.db.query<{ company_id: string; branch_id: string | null; role: string }>(
      `SELECT company_id, branch_id, role
       FROM company_memberships
       WHERE user_id = $1 AND company_id = $2 AND is_active = true
       LIMIT 1`,
      [userId, companyId],
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('You do not have access to this company.');
    }

    const m = result.rows[0];
    return {
      companyId: m.company_id,
      branchId: m.branch_id,
      role: m.role,
    };
  }

  async requireRole(
    userId: string,
    companyId: string,
    allowedRoles: string[],
  ): Promise<MembershipInfo> {
    const membership = await this.getMembershipForCompany(userId, companyId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of: ${allowedRoles.join(', ')}`,
      );
    }

    return membership;
  }

  async requireOwnerOrAdmin(userId: string, companyId: string): Promise<MembershipInfo> {
    return this.requireRole(userId, companyId, ['owner', 'admin']);
  }
}
