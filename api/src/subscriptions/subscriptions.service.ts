import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';

const MODULE_LABELS: Record<string, string> = {
  core: 'Omega Core',
  inventory: 'Inventory & Warehousing',
  sales: 'Sales',
  pos: 'Point of Sale',
  reports: 'Reports',
  accounting: 'Finance & Accounting',
  procurement: 'Procurement',
  crm: 'CRM',
  manufacturing: 'Manufacturing',
  hr_workforce: 'HR & Workforce',
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly db: DatabaseService) {}

  async getPlans() {
    const result = await this.db.query<{
      code: string;
      name: string;
      description: string;
      monthly_price_kes: number;
      max_users: number;
      max_branches: number;
      modules: string[];
    }>(
      `SELECT code, name, description, monthly_price_kes, max_users, max_branches, modules
       FROM subscription_plans WHERE is_active = TRUE
       ORDER BY monthly_price_kes ASC`,
    );

    return result.rows.map((plan) => ({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthlyPriceKes: Number(plan.monthly_price_kes),
      currency: 'KES',
      billingPeriod: 'monthly',
      limits: { users: plan.max_users, branches: plan.max_branches },
      modules: plan.modules.map((code) => ({
        code,
        name: MODULE_LABELS[code] ?? code,
      })),
    }));
  }

  async getCurrent(companyId: string) {
    const result = await this.db.query<{
      plan_code: string;
      status: string;
      billing_period: string;
      current_period_start: Date | null;
      current_period_end: Date | null;
      plan_name: string;
      monthly_price_kes: number;
      max_users: number;
      max_branches: number;
      modules: string[];
    }>(
      `SELECT s.plan_code, s.status, s.billing_period, s.current_period_start,
              s.current_period_end, p.name AS plan_name, p.monthly_price_kes,
              p.max_users, p.max_branches, p.modules
       FROM company_subscriptions s
       JOIN subscription_plans p ON p.code = s.plan_code
       WHERE s.company_id = $1`,
      [companyId],
    );

    if (!result.rows.length) {
      // Preserve access for existing tenants until payment and entitlement enforcement
      // have been rolled out; this is not a paid subscription.
      return {
        subscription: null,
        accessMode: 'legacy_unmetered',
        message: 'No subscription is recorded for this company yet.',
      };
    }

    const row = result.rows[0];
    const overrides = await this.db.query<{ module_code: string; enabled: boolean }>(
      `SELECT module_code, enabled FROM company_module_overrides
       WHERE company_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [companyId],
    );
    const moduleAccess = new Map(row.modules.map((module) => [module, true]));
    for (const override of overrides.rows) moduleAccess.set(override.module_code, override.enabled);

    return {
      subscription: {
        planCode: row.plan_code,
        planName: row.plan_name,
        status: row.status,
        billingPeriod: row.billing_period,
        monthlyPriceKes: Number(row.monthly_price_kes),
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        limits: { users: row.max_users, branches: row.max_branches },
      },
      accessMode: 'subscription',
      modules: Object.fromEntries(moduleAccess),
    };
  }

  async requestPlanChange(companyId: string, userId: string, planCode: string, note?: string) {
    const normalizedCode = planCode.trim().toLowerCase();
    if (!/^(starter|business|enterprise)$/.test(normalizedCode)) {
      throw new BadRequestException('Choose Starter, Business, or Enterprise.');
    }
    const plan = await this.db.query<{ code: string }>(
      'SELECT code FROM subscription_plans WHERE code = $1 AND is_active = TRUE',
      [normalizedCode],
    );
    if (!plan.rows.length) throw new NotFoundException('The selected plan is not available.');

    const result = await this.db.query<{
      id: string;
      requested_plan_code: string;
      status: string;
      created_at: Date;
    }>(
      `INSERT INTO subscription_change_requests
         (company_id, requested_by, requested_plan_code, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, requested_plan_code, status, created_at`,
      [companyId, userId, normalizedCode, note?.trim().slice(0, 1000) || null],
    );

    return {
      request: result.rows[0],
      message: 'Plan request submitted. Current access has not changed; activation requires billing confirmation.',
    };
  }
  async requestModuleChange(companyId: string, userId: string, moduleCode: string, note?: string) {
    const normalizedModule = moduleCode.trim().toLowerCase();
    if (!Object.keys(MODULE_LABELS).includes(normalizedModule) || normalizedModule === 'core') {
      throw new BadRequestException('Choose a valid optional Omega module.');
    }
    const subscriptionResult = await this.db.query<{ status: string; modules: string[] }>(
      `SELECT s.status, p.modules FROM company_subscriptions s
       JOIN subscription_plans p ON p.code = s.plan_code WHERE s.company_id = $1`,
      [companyId],
    );
    if (!subscriptionResult.rows.length) throw new BadRequestException('Choose a subscription plan before requesting an add-on module.');
    const subscription = subscriptionResult.rows[0];
    if (!['active', 'trialing'].includes(subscription.status)) {
      throw new BadRequestException('The subscription must be active before requesting add-on modules.');
    }
    const override = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM company_module_overrides
       WHERE company_id = $1 AND module_code = $2
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [companyId, normalizedModule],
    );
    if (subscription.modules.includes(normalizedModule) || override.rows[0]?.enabled) {
      throw new BadRequestException('This module is already included or enabled for your company.');
    }
    try {
      const result = await this.db.query<{
        id: string; module_code: string; status: string; created_at: Date;
      }>(
        `INSERT INTO subscription_module_requests (company_id, requested_by, module_code, note)
         VALUES ($1, $2, $3, $4) RETURNING id, module_code, status, created_at`,
        [companyId, userId, normalizedModule, note?.trim().slice(0, 1000) || null],
      );
      return {
        request: result.rows[0],
        message: 'Add-on request submitted. It will not be activated or charged until reviewed and confirmed.',
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('There is already a pending request for this module.');
      }
      throw error;
    }
  }

}
