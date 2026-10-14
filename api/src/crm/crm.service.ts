import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateLeadDto, UpdateLeadDto } from './dto/crm.dto.js';

@Injectable()
export class CrmService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService, private readonly audit: AuditService) {}

  async listLeads(user: AuthenticatedUser, search?: string, status?: string) {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query(
      `SELECT id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status, estimated_value, currency, notes, converted_customer_id, created_at, updated_at
       FROM crm_leads WHERE company_id = $1
       AND ($2::text IS NULL OR status = $2)
       AND ($3::text IS NULL OR contact_name ILIKE $3 OR organization_name ILIKE $3 OR email ILIKE $3 OR phone ILIKE $3)
       ORDER BY created_at DESC LIMIT 250`,
      [membership.companyId, status ?? null, search ? `%${search}%` : null],
    );
    return result.rows;
  }

  async createLead(user: AuthenticatedUser, dto: CreateLeadDto) {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query(
      `INSERT INTO crm_leads (company_id, owner_user_id, contact_name, organization_name, email, phone, source, estimated_value, currency, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status, estimated_value, currency, notes, created_at, updated_at`,
      [membership.companyId, user.userId, dto.contactName, dto.organizationName ?? null, dto.email ?? null, dto.phone ?? null, dto.source ?? null, dto.estimatedValue ?? 0, (dto.currency ?? 'KES').toUpperCase(), dto.notes ?? null],
    );
    const lead = result.rows[0];
    await this.audit.log({ userId: user.userId, companyId: membership.companyId, branchId: null, action: 'crm.lead.create', entityType: 'crm_lead', entityId: String(lead.id), oldValues: null, newValues: { contactName: dto.contactName, status: 'new' }, ipAddress: null });
    return lead;
  }

  async updateLead(user: AuthenticatedUser, leadId: string, dto: UpdateLeadDto) {
    const membership = await this.memberships.getMembership(user.userId);
    const allowed: Record<string, string> = { contactName: 'contact_name', organizationName: 'organization_name', email: 'email', phone: 'phone', source: 'source', status: 'status', estimatedValue: 'estimated_value', notes: 'notes' };
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(dto, key)) {
        values.push((dto as Record<string, unknown>)[key] as string | number | null);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (!sets.length) return this.getLead(user, leadId);
    sets.push('updated_at = now()');
    values.push(leadId, membership.companyId);
    const result = await this.db.query(`UPDATE crm_leads SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status, estimated_value, currency, notes, converted_customer_id, created_at, updated_at`, values);
    if (!result.rows.length) throw new NotFoundException('CRM lead not found.');
    await this.audit.log({ userId: user.userId, companyId: membership.companyId, branchId: null, action: 'crm.lead.update', entityType: 'crm_lead', entityId: leadId, oldValues: null, newValues: dto as Record<string, unknown>, ipAddress: null });
    return result.rows[0];
  }

  async getLead(user: AuthenticatedUser, leadId: string) {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query(`SELECT id, company_id, owner_user_id, contact_name, organization_name, email, phone, source, status, estimated_value, currency, notes, converted_customer_id, created_at, updated_at FROM crm_leads WHERE id = $1 AND company_id = $2`, [leadId, membership.companyId]);
    if (!result.rows.length) throw new NotFoundException('CRM lead not found.');
    return result.rows[0];
  }

  async pipelineSummary(user: AuthenticatedUser) {
    const membership = await this.memberships.getMembership(user.userId);
    const [leads, opportunities] = await Promise.all([
      this.db.query(`SELECT status, count(*)::int AS count, COALESCE(sum(estimated_value),0)::numeric AS value FROM crm_leads WHERE company_id = $1 GROUP BY status ORDER BY status`, [membership.companyId]),
      this.db.query(`SELECT stage, count(*)::int AS count, COALESCE(sum(expected_value),0)::numeric AS value, COALESCE(sum(expected_value * probability / 100.0),0)::numeric AS weighted_value FROM crm_opportunities WHERE company_id = $1 GROUP BY stage ORDER BY stage`, [membership.companyId]),
    ]);
    return { leads: leads.rows, opportunities: opportunities.rows, currency: 'KES' };
  }
}
