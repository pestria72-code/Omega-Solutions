import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type {
  CreateActivityDto, CreateLeadDto, CreateOpportunityDto, UpdateActivityDto,
  UpdateLeadDto, UpdateOpportunityDto,
} from './dto/crm.dto.js';

@Injectable()
export class CrmService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  private async companyId(user: AuthenticatedUser) {
    return (await this.memberships.getMembership(user.userId)).companyId;
  }

  private async auditChange(user: AuthenticatedUser, action: string, entityType: string, entityId: string, newValues: Record<string, unknown>) {
    const membership = await this.memberships.getMembership(user.userId);
    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: membership.branchId,
      action, entityType, entityId, oldValues: null, newValues, ipAddress: null,
    });
  }

  async listLeads(user: AuthenticatedUser, search?: string, status?: string) {
    const companyId = await this.companyId(user);
    const allowed = ['new', 'qualified', 'unqualified', 'converted'];
    if (status && !allowed.includes(status)) throw new BadRequestException('Invalid lead status.');
    const result = await this.db.query(
      `SELECT id, company_id, owner_user_id, contact_name, organization_name, email, phone, source,
              status, estimated_value, currency, notes, converted_customer_id, created_at, updated_at
       FROM crm_leads WHERE company_id = $1
         AND ($2::text IS NULL OR status = $2)
         AND ($3::text IS NULL OR contact_name ILIKE $3 OR organization_name ILIKE $3 OR email::text ILIKE $3 OR phone ILIKE $3)
       ORDER BY created_at DESC LIMIT 250`,
      [companyId, status ?? null, search ? `%${search}%` : null],
    );
    return result.rows;
  }

  async createLead(user: AuthenticatedUser, dto: CreateLeadDto) {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query(
      `INSERT INTO crm_leads (company_id, owner_user_id, contact_name, organization_name, email, phone, source, estimated_value, currency, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status,
                 estimated_value, currency, notes, converted_customer_id, created_at, updated_at`,
      [membership.companyId, user.userId, dto.contactName.trim(), dto.organizationName?.trim() || null,
       dto.email?.trim() || null, dto.phone?.trim() || null, dto.source?.trim() || null,
       dto.estimatedValue ?? 0, (dto.currency ?? 'KES').toUpperCase(), dto.notes?.trim() || null],
    );
    const lead = result.rows[0];
    await this.auditChange(user, 'crm.lead.create', 'crm_lead', String(lead.id), { contactName: dto.contactName, status: 'new' });
    return lead;
  }

  async updateLead(user: AuthenticatedUser, leadId: string, dto: UpdateLeadDto) {
    const companyId = await this.companyId(user);
    const columns: Record<keyof UpdateLeadDto, string> = {
      contactName: 'contact_name', organizationName: 'organization_name', email: 'email',
      phone: 'phone', source: 'source', status: 'status', estimatedValue: 'estimated_value',
      currency: 'currency', notes: 'notes',
    };
    const values: Array<string | number | null> = [];
    const sets: string[] = [];
    for (const key of Object.keys(columns) as Array<keyof UpdateLeadDto>) {
      if (dto[key] !== undefined) {
        const value = dto[key];
        values.push(typeof value === 'string' && ['contactName','organizationName','email','phone','source','notes'].includes(key) ? (value.trim() || null) : value as string | number);
        sets.push(`${columns[key]} = $${values.length}`);
      }
    }
    if (!sets.length) return this.getLead(user, leadId);
    sets.push('updated_at = NOW()');
    values.push(leadId, companyId);
    const result = await this.db.query(
      `UPDATE crm_leads SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND company_id = $${values.length}
       RETURNING id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status,
                 estimated_value, currency, notes, converted_customer_id, created_at, updated_at`,
      values,
    );
    if (!result.rows.length) throw new NotFoundException('CRM lead not found.');
    await this.auditChange(user, 'crm.lead.update', 'crm_lead', leadId, { ...dto });
    return result.rows[0];
  }

  async getLead(user: AuthenticatedUser, leadId: string) {
    const companyId = await this.companyId(user);
    const result = await this.db.query(
      `SELECT id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status,
              estimated_value, currency, notes, converted_customer_id, created_at, updated_at
       FROM crm_leads WHERE id = $1 AND company_id = $2`, [leadId, companyId],
    );
    if (!result.rows.length) throw new NotFoundException('CRM lead not found.');
    return result.rows[0];
  }

  async listOpportunities(user: AuthenticatedUser, stage?: string, search?: string) {
    const companyId = await this.companyId(user);
    const result = await this.db.query(
      `SELECT o.*, l.contact_name AS lead_contact_name, c.name AS customer_name,
              ROUND(o.expected_value * o.probability / 100.0, 2) AS weighted_value
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON l.id=o.lead_id AND l.company_id=o.company_id
       LEFT JOIN customers c ON c.id=o.customer_id AND c.company_id=o.company_id
       WHERE o.company_id=$1 AND ($2::text IS NULL OR o.stage=$2)
         AND ($3::text IS NULL OR o.title ILIKE $3 OR l.contact_name ILIKE $3 OR c.name ILIKE $3)
       ORDER BY o.expected_close_date NULLS LAST, o.created_at DESC LIMIT 250`,
      [companyId, stage ?? null, search ? `%${search}%` : null],
    );
    return result.rows;
  }

  async createOpportunity(user: AuthenticatedUser, dto: CreateOpportunityDto) {
    const membership = await this.memberships.getMembership(user.userId);
    if (!dto.leadId && !dto.customerId) throw new BadRequestException('An opportunity must be linked to a lead or customer.');
    if (dto.leadId) await this.getLead(user, dto.leadId);
    if (dto.customerId) {
      const customer = await this.db.query('SELECT id FROM customers WHERE id=$1 AND company_id=$2', [dto.customerId, membership.companyId]);
      if (!customer.rows.length) throw new NotFoundException('CRM customer not found.');
    }
    const result = await this.db.query(
      `INSERT INTO crm_opportunities (company_id,lead_id,customer_id,owner_user_id,title,stage,expected_value,probability,expected_close_date,loss_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [membership.companyId, dto.leadId ?? null, dto.customerId ?? null, user.userId, dto.title.trim(),
       dto.stage ?? 'qualification', dto.expectedValue ?? 0, dto.probability ?? 10, dto.expectedCloseDate ?? null, dto.lossReason ?? null],
    );
    const opportunity = result.rows[0];
    await this.auditChange(user, 'crm.opportunity.create', 'crm_opportunity', String(opportunity.id), { title: dto.title, stage: opportunity.stage });
    return opportunity;
  }

  async updateOpportunity(user: AuthenticatedUser, id: string, dto: UpdateOpportunityDto) {
    const companyId = await this.companyId(user);
    const columns: Record<keyof UpdateOpportunityDto, string> = {
      title: 'title', stage: 'stage', expectedValue: 'expected_value', probability: 'probability',
      expectedCloseDate: 'expected_close_date', lossReason: 'loss_reason',
    };
    const values: unknown[] = [];
    const sets: string[] = [];
    for (const key of Object.keys(columns) as Array<keyof UpdateOpportunityDto>) {
      if (dto[key] !== undefined) { values.push(dto[key] ?? null); sets.push(`${columns[key]}=$${values.length}`); }
    }
    if (!sets.length) return this.getOpportunity(user, id);
    sets.push('updated_at=NOW()'); values.push(id, companyId);
    const result = await this.db.query(
      `UPDATE crm_opportunities SET ${sets.join(',')} WHERE id=$${values.length-1} AND company_id=$${values.length} RETURNING *`,
      values as Array<string | number | null>,
    );
    if (!result.rows.length) throw new NotFoundException('CRM opportunity not found.');
    await this.auditChange(user, 'crm.opportunity.update', 'crm_opportunity', id, { ...dto });
    return result.rows[0];
  }

  async getOpportunity(user: AuthenticatedUser, id: string) {
    const companyId = await this.companyId(user);
    const result = await this.db.query('SELECT * FROM crm_opportunities WHERE id=$1 AND company_id=$2', [id, companyId]);
    if (!result.rows.length) throw new NotFoundException('CRM opportunity not found.');
    return result.rows[0];
  }

  async listActivities(user: AuthenticatedUser, options: { leadId?: string; opportunityId?: string; pending?: boolean } = {}) {
    const companyId = await this.companyId(user);
    const result = await this.db.query(
      `SELECT a.*, l.contact_name AS lead_contact_name, o.title AS opportunity_title
       FROM crm_activities a
       LEFT JOIN crm_leads l ON l.id=a.lead_id AND l.company_id=a.company_id
       LEFT JOIN crm_opportunities o ON o.id=a.opportunity_id AND o.company_id=a.company_id
       WHERE a.company_id=$1 AND ($2::uuid IS NULL OR a.lead_id=$2)
         AND ($3::uuid IS NULL OR a.opportunity_id=$3)
         AND ($4::boolean IS FALSE OR a.completed_at IS NULL)
       ORDER BY a.due_at NULLS LAST, a.created_at DESC LIMIT 250`,
      [companyId, options.leadId ?? null, options.opportunityId ?? null, options.pending ?? false],
    );
    return result.rows;
  }

  async createActivity(user: AuthenticatedUser, dto: CreateActivityDto) {
    const membership = await this.memberships.getMembership(user.userId);
    if (!dto.leadId && !dto.opportunityId && !dto.customerId) throw new BadRequestException('Link the activity to a lead, opportunity or customer.');
    if (dto.leadId) await this.getLead(user, dto.leadId);
    if (dto.opportunityId) await this.getOpportunity(user, dto.opportunityId);
    if (dto.customerId) {
      const customer = await this.db.query('SELECT id FROM customers WHERE id=$1 AND company_id=$2', [dto.customerId, membership.companyId]);
      if (!customer.rows.length) throw new NotFoundException('CRM customer not found.');
    }
    const result = await this.db.query(
      `INSERT INTO crm_activities (company_id,lead_id,opportunity_id,customer_id,assigned_user_id,activity_type,subject,description,due_at,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [membership.companyId, dto.leadId ?? null, dto.opportunityId ?? null, dto.customerId ?? null,
       dto.assignedUserId ?? user.userId, dto.activityType, dto.subject.trim(), dto.description ?? null, dto.dueAt ?? null, user.userId],
    );
    const activity = result.rows[0];
    await this.auditChange(user, 'crm.activity.create', 'crm_activity', String(activity.id), { subject: dto.subject, activityType: dto.activityType });
    return activity;
  }

  async completeActivity(user: AuthenticatedUser, id: string, dto: UpdateActivityDto) {
    const companyId = await this.companyId(user);
    const result = await this.db.query(
      `UPDATE crm_activities SET completed_at=CASE WHEN $3::boolean THEN COALESCE(completed_at,NOW()) ELSE NULL END
       WHERE id=$1 AND company_id=$2 RETURNING *`,
      [id, companyId, dto.completed !== false],
    );
    if (!result.rows.length) throw new NotFoundException('CRM activity not found.');
    await this.auditChange(user, 'crm.activity.complete', 'crm_activity', id, { completed: dto.completed !== false });
    return result.rows[0];
  }

  async pipelineSummary(user: AuthenticatedUser) {
    const companyId = await this.companyId(user);
    const [leads, opportunities, activities] = await Promise.all([
      this.db.query(`SELECT status,count(*)::int AS count,COALESCE(sum(estimated_value),0)::numeric AS value FROM crm_leads WHERE company_id=$1 GROUP BY status ORDER BY status`, [companyId]),
      this.db.query(`SELECT stage,count(*)::int AS count,COALESCE(sum(expected_value),0)::numeric AS value,COALESCE(sum(expected_value*probability/100.0),0)::numeric AS weighted_value FROM crm_opportunities WHERE company_id=$1 GROUP BY stage ORDER BY stage`, [companyId]),
      this.db.query(`SELECT count(*) FILTER (WHERE completed_at IS NULL)::int AS pending, count(*) FILTER (WHERE completed_at IS NULL AND due_at < NOW())::int AS overdue FROM crm_activities WHERE company_id=$1`, [companyId]),
    ]);
    return { leads: leads.rows, opportunities: opportunities.rows, activities: activities.rows[0], currency: 'KES' };
  }
}
