import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

type RegisterInput = { code: string; name: string; branchId?: string | null };
type OpenShiftInput = { registerId: string; openingFloat: number };
type CloseShiftInput = { countedCash: number; notes?: string };

@Injectable()
export class PosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  private async company(user: AuthenticatedUser) {
    return user.companyId
      ? this.memberships.getMembershipForCompany(user.userId, user.companyId)
      : this.memberships.getMembership(user.userId);
  }

  async listRegisters(user: AuthenticatedUser) {
    const { companyId } = await this.company(user);
    const result = await this.db.query(
      `SELECT r.id,r.company_id,r.branch_id,r.code,r.name,r.is_active,r.created_at,
        b.name AS branch_name,
        s.id AS open_shift_id,s.opened_by,s.opening_float,s.opened_at
       FROM pos_registers r
       LEFT JOIN branches b ON b.id=r.branch_id AND b.company_id=r.company_id
       LEFT JOIN pos_shifts s ON s.register_id=r.id AND s.company_id=r.company_id AND s.status='open'
       WHERE r.company_id=$1 ORDER BY r.is_active DESC,r.name ASC`,
      [companyId],
    );
    return result.rows;
  }

  async createRegister(user: AuthenticatedUser, input: RegisterInput) {
    const { companyId } = await this.company(user);
    const code = input.code?.trim().toUpperCase();
    const name = input.name?.trim();
    if (!code || code.length > 32) throw new BadRequestException('Register code is required and must be at most 32 characters.');
    if (!name || name.length > 120) throw new BadRequestException('Register name is required and must be at most 120 characters.');
    if (input.branchId) {
      const branch = await this.db.query('SELECT id FROM branches WHERE id=$1 AND company_id=$2 AND is_active=true', [input.branchId, companyId]);
      if (!branch.rows[0]) throw new BadRequestException('Select an active branch belonging to this company.');
    }
    let register;
    try {
      const result = await this.db.query(
        `INSERT INTO pos_registers(company_id,branch_id,code,name)
         VALUES($1,$2,$3,$4)
         RETURNING id,company_id,branch_id,code,name,is_active,created_at`,
        [companyId, input.branchId ?? null, code, name],
      );
      register = result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('A register with this code already exists in this company.');
      throw error;
    }
    await this.audit.log({
      userId:user.userId, companyId, branchId:input.branchId ?? null,
      action:'pos.register.create', entityType:'pos_register', entityId:String((register as {id:string}).id),
      oldValues:null, newValues:{code,name}, ipAddress:null,
    });
    return register;
  }

  async currentShift(user: AuthenticatedUser) {
    const { companyId } = await this.company(user);
    const result = await this.db.query(
      `SELECT s.*,r.code AS register_code,r.name AS register_name
       FROM pos_shifts s JOIN pos_registers r ON r.id=s.register_id AND r.company_id=s.company_id
       WHERE s.company_id=$1 AND s.status='open' AND s.opened_by=$2
       ORDER BY s.opened_at DESC LIMIT 1`,
      [companyId, user.userId],
    );
    return result.rows[0] ?? null;
  }

  async openShift(user: AuthenticatedUser, input: OpenShiftInput) {
    const { companyId } = await this.company(user);
    const openingFloat = Number(input.openingFloat);
    if (!input.registerId || !Number.isFinite(openingFloat) || openingFloat < 0 || Math.round(openingFloat * 100) !== openingFloat * 100) {
      throw new BadRequestException('Choose a register and enter a non-negative opening float with at most two decimal places.');
    }
    let shift;
    try {
      shift = await this.db.transaction(async (client) => {
        const register = await client.query<{id:string;branch_id:string|null}>(
          'SELECT id,branch_id FROM pos_registers WHERE id=$1 AND company_id=$2 AND is_active=true FOR UPDATE',
          [input.registerId, companyId],
        );
        if (!register.rows[0]) throw new NotFoundException('Active POS register not found in this company.');
        const alreadyOpen = await client.query<{id:string}>(
          "SELECT id FROM pos_shifts WHERE register_id=$1 AND company_id=$2 AND status='open' FOR UPDATE",
          [input.registerId, companyId],
        );
        if (alreadyOpen.rows[0]) throw new ConflictException('This register already has an open cashier shift.');
        const inserted = await client.query(
          `INSERT INTO pos_shifts(company_id,register_id,opened_by,opening_float)
           VALUES($1,$2,$3,$4) RETURNING *`,
          [companyId,input.registerId,user.userId,openingFloat],
        );
        return inserted.rows[0];
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('This register already has an open cashier shift.');
      throw error;
    }
    await this.audit.log({
      userId:user.userId, companyId, branchId:null, action:'pos.shift.open',
      entityType:'pos_shift', entityId:String((shift as {id:string}).id), oldValues:null,
      newValues:{registerId:input.registerId,openingFloat}, ipAddress:null,
    });
    return shift;
  }

  async closeShift(user: AuthenticatedUser, shiftId: string, input: CloseShiftInput) {
    const { companyId } = await this.company(user);
    const countedCash = Number(input.countedCash);
    if (!Number.isFinite(countedCash) || countedCash < 0 || Math.round(countedCash * 100) !== countedCash * 100) {
      throw new BadRequestException('Counted cash must be non-negative with at most two decimal places.');
    }
    const shift = await this.db.transaction(async (client) => {
      const result = await client.query<{id:string;opened_by:string;opening_float:string|number;status:string;register_id:string}>(
        'SELECT id,opened_by,opening_float,status,register_id FROM pos_shifts WHERE id=$1 AND company_id=$2 FOR UPDATE',
        [shiftId,companyId],
      );
      const existing = result.rows[0];
      if (!existing) throw new NotFoundException('POS shift not found.');
      if (existing.status !== 'open') throw new ConflictException('This shift is already closed.');
      if (existing.opened_by !== user.userId) throw new ConflictException('Only the cashier who opened this shift may close it.');
      const cash = await client.query<{total:string|number}>(
        `SELECT COALESCE(SUM(p.amount),0) AS total
         FROM invoice_payments p JOIN invoices i ON i.id=p.invoice_id AND i.company_id=p.company_id
         WHERE p.company_id=$1 AND p.status='confirmed' AND p.method='cash'
           AND p.created_by=$2 AND p.created_at >= (SELECT opened_at FROM pos_shifts WHERE id=$3)
           AND p.created_at <= NOW()`,
        [companyId,user.userId,shiftId],
      );
      const expectedCash = Math.round((Number(existing.opening_float)+Number(cash.rows[0]?.total ?? 0))*100)/100;
      const difference = Math.round((countedCash-expectedCash)*100)/100;
      const updated = await client.query(
        `UPDATE pos_shifts SET status='closed',closed_by=$3,closed_at=NOW(),
          expected_cash=$4,counted_cash=$5,cash_difference=$6,notes=$7
         WHERE id=$1 AND company_id=$2 AND status='open' RETURNING *`,
        [shiftId,companyId,user.userId,expectedCash,countedCash,difference,input.notes?.trim() || null],
      );
      return updated.rows[0];
    });
    await this.audit.log({
      userId:user.userId, companyId, branchId:null, action:'pos.shift.close',
      entityType:'pos_shift', entityId:shiftId, oldValues:{status:'open'},
      newValues:{status:'closed',countedCash,expectedCash:(shift as {expected_cash:number|string}).expected_cash,cashDifference:(shift as {cash_difference:number|string}).cash_difference},
      ipAddress:null,
    });
    return shift;
  }
}
