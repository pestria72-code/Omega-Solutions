import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;

@Injectable()
export class PayrollRemittancesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
  ) {}

  private membershipFor(user: AuthenticatedUser) {
    return user.companyId
      ? this.memberships.getMembershipForCompany(user.userId, user.companyId)
      : this.memberships.getMembership(user.userId);
  }

  async list(user: AuthenticatedUser) {
    const { companyId } = await this.membershipFor(user);
    return (await this.db.query(
      `SELECT o.id,o.payroll_run_id,o.authority,o.period_start,o.period_end,o.due_date,o.amount,
              o.created_at,COALESCE(p.amount_paid,0)::numeric(14,2) AS amount_paid,
              GREATEST(o.amount-COALESCE(p.amount_paid,0),0)::numeric(14,2) AS balance,
              CASE WHEN COALESCE(p.amount_paid,0)>=o.amount THEN 'paid'
                   WHEN COALESCE(p.amount_paid,0)>0 THEN 'partially_paid'
                   WHEN o.due_date<CURRENT_DATE THEN 'overdue' ELSE 'unpaid' END AS status,
              COALESCE(p.payment_count,0)::int AS payment_count
       FROM payroll_remittance_obligations o
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS amount_paid,COUNT(*) AS payment_count
         FROM payroll_remittance_payments WHERE company_id=o.company_id AND obligation_id=o.id
       ) p ON TRUE
       WHERE o.company_id=$1
       ORDER BY o.due_date,o.authority,o.period_start DESC`,
      [companyId],
    )).rows;
  }

  async generateForRun(user: AuthenticatedUser, runId: string, dueDate: unknown) {
    if (!validDate(dueDate)) throw new BadRequestException('dueDate must be a valid YYYY-MM-DD date.');
    const { companyId } = await this.membershipFor(user);
    return this.db.transaction(async (client) => {
      const run = await client.query(
        `SELECT id,period_start,period_end,status FROM payroll_runs
         WHERE id=$1 AND company_id=$2 FOR UPDATE`,
        [runId, companyId],
      );
      if (!run.rows.length) throw new NotFoundException('Payroll run not found in this company.');
      if (run.rows[0].status !== 'posted') {
        throw new ConflictException('Remittance obligations can only be generated from a posted payroll run.');
      }
      const sums = await client.query(
        `SELECT COALESCE(SUM(paye),0)::numeric(14,2) AS paye,
                COALESCE(SUM(nssf_employee+nssf_employer),0)::numeric(14,2) AS nssf,
                COALESCE(SUM(shif_employee),0)::numeric(14,2) AS shif,
                COALESCE(SUM(housing_levy_employee+housing_levy_employer),0)::numeric(14,2) AS housing_levy
         FROM payroll_items WHERE company_id=$1 AND payroll_run_id=$2`,
        [companyId, runId],
      );
      const amounts: Array<[string, string | number]> = [
        ['PAYE', sums.rows[0].paye],
        ['NSSF', sums.rows[0].nssf],
        ['SHIF', sums.rows[0].shif],
        ['HOUSING_LEVY', sums.rows[0].housing_levy],
      ];
      const created = [];
      for (const [authority, rawAmount] of amounts) {
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Payroll contains an invalid statutory total.');
        if (amount === 0) continue;
        const result = await client.query(
          `INSERT INTO payroll_remittance_obligations
             (company_id,payroll_run_id,authority,period_start,period_end,due_date,amount,created_by)
           VALUES($1,$2,$3,$4::date,$5::date,$6::date,$7,$8)
           ON CONFLICT(company_id,payroll_run_id,authority) DO NOTHING
           RETURNING id,authority,amount,due_date`,
          [companyId, runId, authority, run.rows[0].period_start, run.rows[0].period_end, dueDate, amount, user.userId],
        );
        if (result.rows.length) created.push(result.rows[0]);
      }
      return { payrollRunId: runId, created, message: 'Only newly created obligations are returned. Existing obligations and payment records were not changed. Verify due dates against current authority guidance.' };
    });
  }

  async recordPayment(
    user: AuthenticatedUser,
    obligationId: string,
    dto: { amount?: unknown; paymentReference?: unknown; paidAt?: unknown; receiptStorageKey?: unknown; notes?: unknown },
  ) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      throw new BadRequestException('amount must be a positive monetary amount with no more than two decimal places.');
    }
    if (typeof dto.paymentReference !== 'string' || !dto.paymentReference.trim() || dto.paymentReference.trim().length > 160) {
      throw new BadRequestException('paymentReference is required and must be at most 160 characters.');
    }
    const paidAt = dto.paidAt === undefined ? new Date().toISOString() : dto.paidAt;
    if (typeof paidAt !== 'string' || Number.isNaN(Date.parse(paidAt))) throw new BadRequestException('paidAt must be a valid date/time.');
    if (dto.receiptStorageKey !== undefined && (typeof dto.receiptStorageKey !== 'string' || dto.receiptStorageKey.length > 500)) {
      throw new BadRequestException('receiptStorageKey must be a storage key of at most 500 characters.');
    }
    if (dto.notes !== undefined && (typeof dto.notes !== 'string' || dto.notes.length > 2000)) {
      throw new BadRequestException('notes must be at most 2000 characters.');
    }
    const { companyId } = await this.membershipFor(user);
    return this.db.transaction(async (client) => {
      const obligation = await client.query(
        `SELECT id,amount FROM payroll_remittance_obligations
         WHERE id=$1 AND company_id=$2 FOR UPDATE`,
        [obligationId, companyId],
      );
      if (!obligation.rows.length) throw new NotFoundException('Remittance obligation not found in this company.');
      const paid = await client.query(
        `SELECT COALESCE(SUM(amount),0)::numeric(14,2) AS amount_paid
         FROM payroll_remittance_payments WHERE company_id=$1 AND obligation_id=$2`,
        [companyId, obligationId],
      );
      const remaining = Math.round((Number(obligation.rows[0].amount) - Number(paid.rows[0].amount_paid)) * 100) / 100;
      if (amount > remaining) throw new ConflictException('Payment exceeds the outstanding obligation balance.');
      const result = await client.query(
        `INSERT INTO payroll_remittance_payments
           (company_id,obligation_id,amount,payment_reference,paid_at,receipt_storage_key,notes,recorded_by)
         VALUES($1,$2,$3,$4,$5::timestamptz,$6,$7,$8)
         RETURNING id,obligation_id,amount,payment_reference,paid_at,receipt_storage_key,notes,created_at`,
        [companyId, obligationId, amount, dto.paymentReference.trim(), paidAt, dto.receiptStorageKey ?? null, dto.notes ?? null, user.userId],
      );
      return { ...result.rows[0], verificationStatus: 'recorded_not_independently_verified' };
    });
  }
}
