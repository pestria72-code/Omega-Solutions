import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { SalesOrderRow, SalesOrderStatus } from './sales-order.types.js';

const SELECT_ORDERS = `
  SELECT so.id, so.company_id, so.customer_id, c.name AS customer_name,
         so.source_quotation_id, q.quotation_number AS source_quotation_number,
         so.order_number, so.order_date, so.status, so.currency, so.subtotal,
         so.tax_amount, so.total, so.notes, so.created_at, so.updated_at,
         COUNT(soi.id)::int AS item_count
  FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id AND c.company_id = so.company_id
  LEFT JOIN quotations q ON q.id = so.source_quotation_id AND q.company_id = so.company_id
  LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id AND soi.company_id = so.company_id
`;

@Injectable()
export class SalesOrdersService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService, private readonly audit: AuditService) {}

  async list(user: AuthenticatedUser): Promise<SalesOrderRow[]> {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query<SalesOrderRow>(
      `${SELECT_ORDERS} WHERE so.company_id = $1 GROUP BY so.id, c.name, q.quotation_number ORDER BY so.created_at DESC`,
      [membership.companyId],
    );
    return result.rows;
  }

  async getById(user: AuthenticatedUser, id: string): Promise<SalesOrderRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const result = await this.db.query<SalesOrderRow>(
      `${SELECT_ORDERS} WHERE so.company_id = $1 AND so.id = $2 GROUP BY so.id, c.name, q.quotation_number`,
      [membership.companyId, id],
    );
    const order = result.rows[0];
    if (!order) throw new NotFoundException('Sales order not found.');
    const items = await this.db.query(
      `SELECT id, sales_order_id, product_id, product_name, sku, quantity, unit_price, tax_rate, line_subtotal, tax_amount, line_total
       FROM sales_order_items WHERE company_id = $1 AND sales_order_id = $2 ORDER BY created_at`,
      [membership.companyId, id],
    );
    order.items = items.rows;
    return order;
  }

  async createFromQuotation(user: AuthenticatedUser, quotationId: string): Promise<SalesOrderRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const orderId = await this.db.transaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT id, company_id, customer_id, quotation_number, issue_date, status, currency, subtotal, tax_amount, total, notes
         FROM quotations WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [quotationId, membership.companyId],
      );
      const quote = result.rows[0];
      if (!quote) throw new NotFoundException('Quotation not found.');
      if (quote.status !== 'accepted') throw new BadRequestException('Only accepted quotations can be converted to a sales order.');
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM sales_orders WHERE source_quotation_id = $1 AND company_id = $2',
        [quotationId, membership.companyId],
      );
      if (existing.rows[0]) return existing.rows[0].id;

      const year = Number(String(quote.issue_date).slice(0, 4));
      const seq = await client.query<{ next_number: number }>(
        `INSERT INTO sales_order_sequences (company_id, order_year, next_number) VALUES ($1, $2, 1)
         ON CONFLICT (company_id, order_year) DO UPDATE SET next_number = sales_order_sequences.next_number + 1 RETURNING next_number`,
        [membership.companyId, year],
      );
      const orderNumber = `SO-${year}-${String(seq.rows[0].next_number).padStart(5, '0')}`;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO sales_orders (company_id, customer_id, source_quotation_id, order_number, order_date, status, currency, subtotal, tax_amount, total, notes, created_by)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, 'confirmed', $5, $6, $7, $8, $9, $10) RETURNING id`,
        [membership.companyId, quote.customer_id, quotationId, orderNumber, quote.currency, quote.subtotal, quote.tax_amount, quote.total, quote.notes, user.userId],
      );
      await client.query(
        `INSERT INTO sales_order_items (company_id, sales_order_id, product_id, product_name, sku, quantity, unit_price, tax_rate, line_subtotal, tax_amount, line_total)
         SELECT company_id, $1, product_id, product_name, sku, quantity, unit_price, tax_rate, line_subtotal, tax_amount, line_total
         FROM quotation_items WHERE company_id = $2 AND quotation_id = $3`,
        [inserted.rows[0].id, membership.companyId, quotationId],
      );
      await client.query(
        "UPDATE quotations SET status = 'converted', updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [quotationId, membership.companyId],
      );
      return inserted.rows[0].id;
    });
    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: null,
      action: 'sales_order.create_from_quotation', entityType: 'sales_order', entityId: orderId,
      oldValues: null, newValues: { quotationId }, ipAddress: null,
    });
    return this.getById(user, orderId);
  }

  async updateStatus(user: AuthenticatedUser, id: string, next: string): Promise<SalesOrderRow> {
    const membership = await this.memberships.getMembership(user.userId);
    const current = await this.db.query<{ id: string; status: string }>(
      'SELECT id, status FROM sales_orders WHERE id = $1 AND company_id = $2',
      [id, membership.companyId],
    );
    const order = current.rows[0];
    if (!order) throw new NotFoundException('Sales order not found.');
    const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
      confirmed: ['processing', 'cancelled'],
      processing: ['fulfilled', 'cancelled'],
      fulfilled: [],
      cancelled: [],
    };
    const from = order.status as SalesOrderStatus;
    if (!this.isStatus(next) || !transitions[from]?.includes(next as SalesOrderStatus)) {
      throw new BadRequestException(`Cannot change sales order status from ${from} to ${next}.`);
    }
    await this.db.query('UPDATE sales_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [next, id, membership.companyId]);
    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: null,
      action: 'sales_order.status.update', entityType: 'sales_order', entityId: id,
      oldValues: { status: from }, newValues: { status: next }, ipAddress: null,
    });
    return this.getById(user, id);
  }

  private isStatus(value: string): value is SalesOrderStatus {
    return ['confirmed', 'processing', 'fulfilled', 'cancelled'].includes(value);
  }
}
