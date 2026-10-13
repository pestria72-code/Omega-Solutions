import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';

export interface CompanyInput {
  displayName?: string;
  legalName?: string | null;
  kraPin?: string | null;
  businessType?: string | null;
  phone?: string | null;
  email?: string | null;
  county?: string | null;
  address?: string | null;
  currency?: string;
  timezone?: string;
}

const editableFields = [
  'displayName', 'legalName', 'kraPin', 'businessType', 'phone', 'email',
  'county', 'address', 'currency', 'timezone',
] as const;

@Injectable()
export class CompaniesService {
  constructor(private readonly database: DatabaseService) {}

  private async membership(userId: string, organizationId: string) {
    const result = await this.database.query<{ role: string; organization_id: string }>(
      `SELECT m.role, m."organizationId" AS organization_id
       FROM neon_auth.member m
       WHERE m."userId" = $1::uuid AND m."organizationId" = $2::uuid
       LIMIT 1`,
      [userId, organizationId],
    );
    if (result.rowCount === 0) {
      throw new ForbiddenException('You are not a member of this organization.');
    }
    return result.rows[0];
  }

  async getForOrganization(userId: string, organizationId: string) {
    await this.membership(userId, organizationId);
    const result = await this.database.query(
      `SELECT id, organization_id, display_name, legal_name, kra_pin,
              business_type, phone, email, county, address, currency,
              timezone, status, created_at, updated_at
       FROM public.companies WHERE organization_id = $1::uuid`,
      [organizationId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Company profile has not been created yet.');
    }
    return result.rows[0];
  }

  async createForOrganization(userId: string, organizationId: string, input: CompanyInput) {
    const member = await this.membership(userId, organizationId);
    if (!['owner', 'admin'].includes(member.role)) {
      throw new ForbiddenException('Only organization owners or admins can create a company profile.');
    }
    if (typeof input.displayName !== 'string' || !input.displayName.trim()) {
      throw new BadRequestException('displayName is required and cannot be blank.');
    }
    const currency = input.currency ?? 'KES';
    if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
      throw new BadRequestException('currency must be a three-letter currency code.');
    }

    const result = await this.database.query(
      `INSERT INTO public.companies
        (organization_id, display_name, legal_name, kra_pin, business_type,
         phone, email, county, address, currency, timezone)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, organization_id, display_name, legal_name, kra_pin,
                 business_type, phone, email, county, address, currency,
                 timezone, status, created_at, updated_at`,
      [organizationId, input.displayName.trim(), input.legalName ?? null,
        input.kraPin ?? null, input.businessType ?? null, input.phone ?? null,
        input.email ?? null, input.county ?? null, input.address ?? null,
        currency.toUpperCase(), input.timezone ?? 'Africa/Nairobi'],
    );
    return result.rows[0];
  }

  async updateForOrganization(userId: string, organizationId: string, input: CompanyInput) {
    const member = await this.membership(userId, organizationId);
    if (!['owner', 'admin'].includes(member.role)) {
      throw new ForbiddenException('Only organization owners or admins can update a company profile.');
    }
    const entries = editableFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(input, field),
    );
    if (entries.length === 0) {
      throw new BadRequestException('Provide at least one supported company field to update.');
    }
    if (input.displayName !== undefined &&
        (typeof input.displayName !== 'string' || !input.displayName.trim())) {
      throw new BadRequestException('displayName cannot be blank.');
    }
    if (input.currency !== undefined &&
        (typeof input.currency !== 'string' || !/^[A-Za-z]{3}$/.test(input.currency))) {
      throw new BadRequestException('currency must be a three-letter currency code.');
    }

    const columns: Record<(typeof editableFields)[number], string> = {
      displayName: 'display_name', legalName: 'legal_name', kraPin: 'kra_pin',
      businessType: 'business_type', phone: 'phone', email: 'email',
      county: 'county', address: 'address', currency: 'currency', timezone: 'timezone',
    };
    const values = entries.map((field) => {
      const value = input[field];
      if (field === 'displayName' && typeof value === 'string') return value.trim();
      if (field === 'currency' && typeof value === 'string') return value.toUpperCase();
      return value;
    });
    const assignments = entries.map((field, index) => `${columns[field]} = $${index + 2}`);
    const result = await this.database.query(
      `UPDATE public.companies
       SET ${assignments.join(', ')}, updated_at = now()
       WHERE organization_id = $1::uuid
       RETURNING id, organization_id, display_name, legal_name, kra_pin,
                 business_type, phone, email, county, address, currency,
                 timezone, status, created_at, updated_at`,
      [organizationId, ...values],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Company profile has not been created yet.');
    }
    return result.rows[0];
  }
}
