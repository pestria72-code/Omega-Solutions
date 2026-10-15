import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateInvoiceDto, CreateInvoicePaymentDto } from './dto/invoice.dto.js';
import type { InvoiceItemRow, InvoicePaymentRow, InvoiceRow, InvoiceStatus } from './invoice.types.js';
import type { PoolClient } from 'pg';
import { AccountingService } from '../accounting/accounting.service.js';

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
    private readonly accounting: AccountingService,
  ) {}


  private async postJournal(client: PoolClient, input: {
    companyId: string; date: string | null; description: string; sourceType: string;
    sourceId: string; userId: string;
    lines: Array<{ systemCode: string; debit: number; credit: number; description: string }>;
  }) {
    const year = input.date ? Number(input.date.slice(0, 4)) : new Date().getFullYear();
    const seq = await client.query<{ next_number: number }>(
      `INSERT INTO journal_entry_sequences(company_id,entry_year,next_number) VALUES($1,$2,1)
       ON CONFLICT(company_id,entry_year) DO UPDATE SET next_number=journal_entry_sequences.next_number+1
       RETURNING next_number`, [input.companyId, year],
    );
    const entryNumber = `JE-${year}-${String(seq.rows[0].next_number).padStart(6, '0')}`;
    const entry = await client.query<{ id: string }>(
      `INSERT INTO journal_entries(company_id,entry_number,entry_date,description,source_type,source_id,status,posted_at,posted_by)
       VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,$6,'posted',NOW(),$7) RETURNING id`,
      [input.companyId, entryNumber, input.date, input.description, input.sourceType, input.sourceId, input.userId],
    );
    let debits = 0;
    let credits = 0;
    for (const line of input.lines) {
      if (line.debit <= 0 && line.credit <= 0) continue;
      const account = await client.query<{ id: string }>(
        'SELECT id FROM chart_of_accounts WHERE company_id=$1 AND system_code=$2 AND is_active=true',
        [input.companyId, line.systemCode],
      );
      if (!account.rows[0]) throw new BadRequestException(`Required accounting account "${line.systemCode}" is missing or inactive.`);
      await client.query(
        'INSERT INTO journal_entry_lines(company_id,journal_entry_id,account_id,description,debit,credit) VALUES($1,$2,$3,$4,$5,$6)',
        [input.companyId, entry.rows[0].id, account.rows[0].id, line.description, line.debit, line.credit],
      );
      debits += line.debit;
      credits += line.credit;
    }
    if (Math.abs(debits - credits) > 0.005 || debits <= 0) throw new BadRequestException('Journal entry is not balanced.');
    return entry.rows[0].id;
  }

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
    const items = await this.db.query<InvoiceItemRow>(
      `SELECT id, invoice_id, product_id, product_name, sku, quantity,
              unit_price, tax_rate, line_subtotal, tax_amount, line_total
       FROM invoice_items WHERE company_id = $1 AND invoice_id = $2
       ORDER BY created_at ASC`,
      [membership.companyId, invoiceId],
    );
    invoice.items = items.rows;
    const payments = await this.db.query<InvoicePaymentRow>(
      `SELECT id, invoice_id, amount, method, reference, paid_at, notes, created_at
       FROM invoice_payments WHERE company_id = $1 AND invoice_id = $2
       ORDER BY paid_at DESC, created_at DESC`,
      [membership.companyId, invoiceId],
    );
    invoice.payments = payments.rows;
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

  async recordPayment(
    user: AuthenticatedUser,
    invoiceId: string,
    dto: CreateInvoicePaymentDto,
  ): Promise<InvoiceRow> {
    const membership = await this.memberships.getMembership(user.userId);
    await this.accounting.ensureDefaults(membership.companyId);
    const paymentAmount = Math.round(dto.amount * 100) / 100;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    const payment = await this.db.transaction(async (client) => {
      const result = await client.query<{
        status: InvoiceStatus;
        customer_id: string;
        issue_date: string;
        subtotal: string | number;
        tax_amount: string | number;
        total: string | number;
        amount_paid: string | number;
      }>(
        'SELECT status, customer_id, issue_date, subtotal, tax_amount, total, amount_paid FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE',
        [invoiceId, membership.companyId],
      );
      const invoice = result.rows[0];
      if (!invoice) throw new NotFoundException('Invoice not found.');
      if (invoice.status === 'draft' || invoice.status === 'cancelled') {
        throw new BadRequestException('Only sent invoices can receive payments.');
      }
      const outstandingCents = Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100);
      const paymentCents = Math.round(paymentAmount * 100);
      if (paymentCents > outstandingCents) {
        throw new BadRequestException('Payment exceeds the outstanding invoice balance.');
      }

      const inserted = await client.query<InvoicePaymentRow>(
        `INSERT INTO invoice_payments
          (company_id, invoice_id, amount, method, reference, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, invoice_id, amount, method, reference, paid_at, notes, created_at`,
        [
          membership.companyId, invoiceId, paymentAmount, dto.method,
          dto.reference?.trim() || null, dto.notes?.trim() || null, user.userId,
        ],
      );

      const cashAccount = dto.method === 'cash' ? 'cash' : dto.method === 'mpesa' ? 'mpesa' : 'bank';
      await this.postJournal(client, {
        companyId: membership.companyId, date: null, description: `Receipt against invoice ${invoiceId}`,
        sourceType: 'invoice_payment', sourceId: inserted.rows[0].id, userId: user.userId,
        lines: [
          { systemCode: cashAccount, debit: paymentAmount, credit: 0, description: 'Customer receipt' },
          { systemCode: 'accounts_receivable', debit: 0, credit: paymentAmount, description: 'Reduce customer receivable' },
        ],
      });
      const newPaidCents = Math.round(Number(invoice.amount_paid) * 100) + paymentCents;
      const totalCents = Math.round(Number(invoice.total) * 100);
      const newStatus: InvoiceStatus = newPaidCents >= totalCents ? 'paid' : 'partially_paid';
      await client.query(
        'UPDATE invoices SET amount_paid = $1, status = $2::invoice_status, updated_at = NOW() WHERE id = $3 AND company_id = $4',
        [newPaidCents / 100, newStatus, invoiceId, membership.companyId],
      );
      await client.query(
        'UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1), updated_at = NOW() WHERE id = $2 AND company_id = $3',
        [paymentAmount, invoice.customer_id, membership.companyId],
      );
      return inserted.rows[0];
    });

    await this.audit.log({
      userId: user.userId, companyId: membership.companyId, branchId: membership.branchId,
      action: 'invoice.payment.record', entityType: 'invoice_payment', entityId: payment.id,
      oldValues: null,
      newValues: { invoiceId, amount: payment.amount, method: payment.method, reference: payment.reference },
      ipAddress: null,
    });
    return this.getById(user, invoiceId);
  }

  async updateStatus(user: AuthenticatedUser, invoiceId: string, status: string): Promise<InvoiceRow> {
    const membership = await this.memberships.getMembership(user.userId);
    await this.accounting.ensureDefaults(membership.companyId);
    if (!this.isInvoiceStatus(status)) throw new BadRequestException('Invalid invoice status.');
    if (status !== 'sent' && status !== 'cancelled') {
      throw new BadRequestException('Only draft invoices can be sent, and unpaid invoices can be cancelled.');
    }

    const previousStatus = await this.db.transaction(async (client) => {
      const existing = await client.query<{
        status: InvoiceStatus;
        customer_id: string;
        issue_date: string;
        subtotal: string | number;
        tax_amount: string | number;
        total: string | number;
        amount_paid: string | number;
      }>(
        'SELECT status, customer_id, issue_date, subtotal, tax_amount, total, amount_paid FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE',
        [invoiceId, membership.companyId],
      );
      const invoice = existing.rows[0];
      if (!invoice) throw new NotFoundException('Invoice not found.');
      if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
        throw new BadRequestException('Paid invoices cannot be sent again or cancelled.');
      }
      if (invoice.status === 'cancelled' && status !== 'cancelled') {
        throw new BadRequestException('Cancelled invoices cannot be reopened.');
      }
      if (status === 'sent' && invoice.status !== 'draft' && invoice.status !== 'sent') {
        throw new BadRequestException('Only draft invoices can be sent.');
      }
      if (invoice.status === status) return invoice.status;

      if (status === 'sent' && invoice.status === 'draft') {
        await this.postJournal(client, {
          companyId: membership.companyId, date: invoice.issue_date, description: `Sales invoice ${invoiceId}`,
          sourceType: 'invoice', sourceId: invoiceId, userId: user.userId,
          lines: [
            { systemCode: 'accounts_receivable', debit: Number(invoice.total), credit: 0, description: 'Customer receivable' },
            { systemCode: 'sales_revenue', debit: 0, credit: Number(invoice.subtotal), description: 'Sales revenue' },
            { systemCode: 'output_tax', debit: 0, credit: Number(invoice.tax_amount), description: 'Output tax payable' },
          ],
        });
        await client.query(
          'UPDATE customers SET outstanding_balance = outstanding_balance + $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
          [invoice.total, invoice.customer_id, membership.companyId],
        );
      }
      if (status === 'cancelled' && (invoice.status === 'sent' || invoice.status === 'overdue')) {
        await this.postJournal(client, {
          companyId: membership.companyId, date: null, description: `Reversal of cancelled invoice ${invoiceId}`,
          sourceType: 'invoice_cancellation', sourceId: invoiceId, userId: user.userId,
          lines: [
            { systemCode: 'sales_revenue', debit: Number(invoice.subtotal), credit: 0, description: 'Reverse sales revenue' },
            { systemCode: 'output_tax', debit: Number(invoice.tax_amount), credit: 0, description: 'Reverse output tax' },
            { systemCode: 'accounts_receivable', debit: 0, credit: Number(invoice.total), description: 'Reverse customer receivable' },
          ],
        });
        const remaining = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));
        await client.query(
          'UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - $1), updated_at = NOW() WHERE id = $2 AND company_id = $3',
          [remaining, invoice.customer_id, membership.companyId],
        );
      }
      await client.query(
        'UPDATE invoices SET status = $1::invoice_status, updated_at = NOW() WHERE id = $2 AND company_id = $3',
        [status, invoiceId, membership.companyId],
      );
      return invoice.status;
    });

    if (previousStatus !== status) {
      await this.audit.log({
        userId: user.userId, companyId: membership.companyId, branchId: membership.branchId,
        action: 'invoice.status.update', entityType: 'invoice', entityId: invoiceId,
        oldValues: { status: previousStatus }, newValues: { status }, ipAddress: null,
      });
    }
    return this.getById(user, invoiceId);
  }

  private isInvoiceStatus(value: string): value is InvoiceStatus {
    return ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'].includes(value);
  }
}
