import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateInvoiceDto } from './dto/invoice.dto.js';
import type { InvoiceRow, InvoiceStatus } from './invoice.types.js';

const INVOICE_SELECT = `
  SELECT i.id, i.company_id, i.customer_id, c.name AS customer_name,
         i.invoice_number, i.issue_date, i.due_date, i.status,
         i.currency, i.subtotal, i.tax_amount, i.total, i.amount_paid,
         i.notes, i.created_at, i.updated_at,
         COUNT(ii.id)::int AS item_count
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id AND c.company_id = i.company_id
  LEFT JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.company_id = i.company_id
`;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthenticatedUser, search?: string, status?: string): Promise<InvoiceRow[]> {
    const membership = await this.memberships.getMembership(user.userId);
    const conditions = ['i.company_id = $1'];
    const params: (string | number)[] = [membership.companyId];

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }
    if (status && status !== 'all') {
      if (!this.isInvoiceStatus(status)) throw new BadRequestException('Invalid invoice status.');
      params.push(status);
      conditions.push(`i.status = $${params.length}::invoice_status`);
    }

    const result = await this.db.query<InvoiceRow>(
      `${INVOICE_SELECT}
       WHERE ${conditions.join(' AND ')}
       GROUP BY i.id, c.name
       ORDER BY i.created_at DESC`,
      params,
    );
    return result.rows;
  }

  async getById(user: AuthenticatedUser, invoiceId: string): Promise<InvoiceRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query<InvoiceRow>(
      `${INVOICE_SELECT}
       WHERE i.company_id = $1 AND i.id = $2
       GROUP BY i.id, c.name`,
      [membership.companyId, invoiceId],
    );
    const invoice = result.rows[0];
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const items = await this.db.query(
      `SELECT id, invoice_id, product_id, product_name, sku, quantity,
              unit_price, tax_rate, line_subtotal, tax_amount, line_total
       FROM invoice_items WHERE company_id = $1 AND invoice_id = $2
       ORDER BY created_at ASC`,
      [membership.companyId, invoiceId],
    );
    invoice.items = items.rows as InvoiceRow['items'];
    return invoice;
  }

  async create(user: AuthenticatedUser, dto: CreateInvoiceDto): Promise<InvoiceRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.transaction(async (client) => {
      const customer = await client.query<{ id: string; name: string }>(
        'SELECT id, name FROM customers WHERE id = $1 AND company_id = $2 AND is_active = TRUE FOR SHARE',
        [dto.customerId, membership.companyId],
      );
      if (!customer.rows[0]) throw new BadRequestException('Choose an active customer from your company.');
      if (dto.dueDate < dto.issueDate) throw new BadRequestException('Due date cannot be before issue date.');

      const year = Number(dto.issueDate.slice(0, 4));
      const sequence = await client.query<{ next_number: number }>(
        `INSERT INTO invoice_sequences (company_id, invoice_year, next_number)
         VALUES ($1, $2, 1)
         ON CONFLICT (company_id, invoice_year)
         DO UPDATE SET next_number = invoice_sequences.next_number + 1
         RETURNING next_number`,
        [membership.companyId, year],
      );
      const invoiceNumber = `INV-${year}-${String(sequence.rows[0].next_number).padStart(5, '0')}`;

      let subtotalCents = 0;
      let taxCents = 0;
      const resolved: Array<{
        productId: string; name: string; sku: string; quantity: number;
        unitPriceCents: number; taxRate: number; lineSubtotalCents: number;
        lineTaxCents: number; lineTotalCents: number;
      }> = [];

      for (const item of dto.items) {
        const productResult = await client.query<{
          id: string; name: string; sku: string; selling_price: string | number;
          is_active: boolean; is_service: boolean;
        }>(
          `SELECT id, name, sku, selling_price, is_active, is_service
           FROM products WHERE id = $1 AND company_id = $2 FOR SHARE`,
          [item.productId, membership.companyId],
        );
        const product = productResult.rows[0];
        if (!product || !product.is_active) {
          throw new BadRequestException('Each invoice item must reference an active product from your company.');
        }
        const unitPriceCents = Math.round(Number(item.unitPrice ?? product.selling_price) * 100);
        const quantityMilli = Math.round(item.quantity * 1000);
        const quantity = quantityMilli / 1000;
        const lineSubtotalCents = Math.round(unitPriceCents * quantityMilli / 1000);
        const taxRate = item.taxRate ?? 0;
        const lineTaxCents = Math.round(lineSubtotalCents * taxRate / 100);
        const lineTotalCents = lineSubtotalCents + lineTaxCents;
        subtotalCents += lineSubtotalCents;
        taxCents += lineTaxCents;
        resolved.push({
          productId: product.id, name: product.name, sku: product.sku, quantity,
          unitPriceCents, taxRate, lineSubtotalCents, lineTaxCents, lineTotalCents,
        });
      }

      const totalCents = subtotalCents + taxCents;
      const inserted = await client.query<InvoiceRow>(
        `INSERT INTO invoices
          (company_id, customer_id, invoice_number, issue_date, due_date, status,
           currency, subtotal, tax_amount, total, amount_paid, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, 'draft', 'KES', $6, $7, $8, 0, $9, $10)
         RETURNING id, company_id, customer_id, invoice_number, issue_date, due_date,
                   status, currency, subtotal, tax_amount, total, amount_paid, notes,
                   created_at, updated_at`,
        [
          membership.companyId, dto.customerId, invoiceNumber, dto.issueDate, dto.dueDate,
          subtotalCents / 100, taxCents / 100, totalCents / 100, dto.notes ?? null, user.userId,
        ],
      );
      const invoice = inserted.rows[0];
      for (const item of resolved) {
        await client.query(
          `INSERT INTO invoice_items
            (company_id, invoice_id, product_id, product_name, sku, quantity, unit_price,
             tax_rate, line_subtotal, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            membership.companyId, invoice.id, item.productId, item.name, item.sku, item.quantity,
            item.unitPriceCents / 100, item.taxRate, item.lineSubtotalCents / 100,
            item.lineTaxCents / 100, item.lineTotalCents / 100,
          ],
        );
      }
      return invoice;
    });

    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: membership.branchId,
      action: 'invoice.create', entityType: 'invoice', entityId: result.id,
      oldValues: null, newValues: { invoiceNumber: result.invoice_number, total: result.total },
      ipAddress: null,
    });
    return this.getById(user, result.id);
  }

  async updateStatus(user: AuthenticatedUser, invoiceId: string, status: string): Promise<InvoiceRow> {
    const membership = await this.memberships.getMembership(user.userId);
    if (!this.isInvoiceStatus(status)) throw new BadRequestException('Invalid invoice status.');
    const allowed = new Set<InvoiceStatus>(['draft', 'sent', 'cancelled']);
    if (!allowed.has(status)) {
      throw new BadRequestException('Only draft, sent, or cancelled status changes are supported here. Record payments to mark an invoice paid.');
    }
    const existing = await this.db.query<{ status: InvoiceStatus }>(
      'SELECT status FROM invoices WHERE id = $1 AND company_id = $2',
      [invoiceId, membership.companyId],
    );
    if (!existing.rows[0]) throw new NotFoundException('Invoice not found.');
    if (existing.rows[0].status === 'paid' || existing.rows[0].status === 'partially_paid') {
      throw new BadRequestException('Paid invoices cannot be changed to draft, sent, or cancelled.');
    }
    if (existing.rows[0].status === 'cancelled' && status !== 'cancelled') {
      throw new BadRequestException('Cancelled invoices cannot be reopened.');
    }
    await this.db.query(
      'UPDATE invoices SET status = $1::invoice_status, updated_at = NOW() WHERE id = $2 AND company_id = $3',
      [status, invoiceId, membership.companyId],
    );
    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: membership.branchId,
      action: 'invoice.status.update', entityType: 'invoice', entityId: invoiceId,
      oldValues: { status: existing.rows[0].status }, newValues: { status }, ipAddress: null,
    });
    return this.getById(user, invoiceId);
  }

  private isInvoiceStatus(value: string): value is InvoiceStatus {
    return ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'].includes(value);
  }
}
