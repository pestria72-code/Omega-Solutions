import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CompanyRow } from './company.types.js';
import type { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

const COMPANY_COLUMNS = `
  id, name, registration_number, vat_number, currency, timezone,
  address_line1, address_line2, city, county, postal_code,
  phone, email, website, settings, is_active, created_at, updated_at
`;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  async getMyCompany(user: AuthenticatedUser): Promise<CompanyRow> {
    const membership = await this.memberships.getMembership(user.userId);

    return this.getById(membership.companyId);
  }

  async getById(companyId: string): Promise<CompanyRow> {
    const result = await this.db.query<CompanyRow>(
      `SELECT ${COMPANY_COLUMNS} FROM companies WHERE id = $1`,
      [companyId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Company not found.');
    }

    return result.rows[0];
  }

  async getForUser(user: AuthenticatedUser, companyId: string): Promise<CompanyRow> {
    await this.memberships.getMembershipForCompany(user.userId, companyId);
    return this.getById(companyId);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateCompanyDto,
  ): Promise<CompanyRow> {
    await this.memberships.requireOwnerOrAdmin(
      user.userId,
      user.companyId ?? '',
    );

    // The creator must become an owner of the new tenant. Keep the company
    // and membership inserts atomic to prevent orphaned companies.
    const currency = (dto.currency ?? 'KES').toUpperCase();
    const timezone = dto.timezone ?? 'Africa/Nairobi';
    const company = await this.db.transaction(async (client) => {
      const result = await client.query<CompanyRow>(
        `INSERT INTO companies
          (name, registration_number, vat_number, currency, timezone,
           address_line1, address_line2, city, county, postal_code,
           phone, email, website, settings, is_active)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '{}', true)
         RETURNING ${COMPANY_COLUMNS}`,
        [
          dto.name.trim(),
          dto.registrationNumber ?? null,
          dto.vatNumber ?? null,
          currency,
          timezone,
          dto.addressLine1 ?? null,
          dto.addressLine2 ?? null,
          dto.city ?? null,
          dto.county ?? null,
          dto.postalCode ?? null,
          dto.phone ?? null,
          dto.email ?? null,
          dto.website ?? null,
        ],
      );

      const created = result.rows[0];
      await client.query(
        `INSERT INTO company_memberships (user_id, company_id, role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [user.userId, created.id],
      );
      return created;
    });

    await this.audit.log({
      userId: user.userId,
      companyId: company.id,
      branchId: null,
      action: 'company.create',
      entityType: 'company',
      entityId: company.id,
      oldValues: null,
      newValues: { name: company.name, currency },
      ipAddress: null,
    });

    return company;
  }

  async update(
    user: AuthenticatedUser,
    companyId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyRow> {
    await this.memberships.requireOwnerOrAdmin(user.userId, companyId);

    const existing = await this.getById(companyId);

    const fields: string[] = [];
    const values: (string | boolean | null)[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      registrationNumber: 'registration_number',
      vatNumber: 'vat_number',
      currency: 'currency',
      timezone: 'timezone',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      city: 'city',
      county: 'county',
      postalCode: 'postal_code',
      phone: 'phone',
      email: 'email',
      website: 'website',
      isActive: 'is_active',
    };

    for (const [dtoKey, dbColumn] of Object.entries(fieldMap)) {
      if (dtoKey in dto) {
        const value = (dto as Record<string, unknown>)[dtoKey];
        if (dtoKey === 'currency' && typeof value === 'string') {
          fields.push(`${dbColumn} = $${paramIndex}`);
          values.push(value.toUpperCase());
        } else {
          fields.push(`${dbColumn} = $${paramIndex}`);
          values.push(value as string | boolean | null);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(companyId);

    const result = await this.db.query<CompanyRow>(
      `UPDATE companies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${COMPANY_COLUMNS}`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Company not found.');
    }

    const updated = result.rows[0];

    await this.audit.log({
      userId: user.userId,
      companyId: updated.id,
      branchId: null,
      action: 'company.update',
      entityType: 'company',
      entityId: updated.id,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
      ipAddress: null,
    });

    return updated;
  }
}
