import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Injectable()
export class WorkforceService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService, private readonly audit: AuditService) {}
  private async membership(u: AuthenticatedUser) { return u.companyId ? this.memberships.getMembershipForCompany(u.userId, u.companyId) : this.memberships.getMembership(u.userId); }
  private required(v: unknown, label: string) { if (typeof v !== 'string' || !v.trim()) throw new BadRequestException(label + ' is required.'); return v.trim(); }
  private date(v: unknown, label: string) { const s = this.required(v, label); const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!match) throw new BadRequestException(label + ' must be a real date in YYYY-MM-DD format.'); const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]); const parsed = new Date(Date.UTC(year, month - 1, day)); if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new BadRequestException(label + ' must be a real date in YYYY-MM-DD format.'); return s; }
  private rate(v: unknown) { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new BadRequestException('payRate must be non-negative.'); return n; }

  async sites(u: AuthenticatedUser) { const m = await this.membership(u); return (await this.db.query('SELECT * FROM client_sites WHERE company_id=$1 ORDER BY client_name,site_name', [m.companyId])).rows; }
  async createSite(u: AuthenticatedUser, d: Record<string, unknown>) {
    const m = await this.membership(u);
    try {
      const row = (await this.db.query('INSERT INTO client_sites(company_id,site_code,site_name,client_name,address,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [m.companyId,this.required(d.siteCode,'siteCode'),this.required(d.siteName,'siteName'),this.required(d.clientName,'clientName'),typeof d.address === 'string' ? d.address.trim() || null : null,u.userId])).rows[0];
      await this.audit.log({userId:u.userId,companyId:m.companyId,branchId:m.branchId,action:'workforce.site.create',entityType:'client_site',entityId:String(row.id),oldValues:null,newValues:{siteCode:row.site_code,siteName:row.site_name},ipAddress:null}); return row;
    } catch (e) { if ((e as {code?:string}).code === '23505') throw new ConflictException('Site code already exists in this company.'); throw e; }
  }
  async assignments(u: AuthenticatedUser) {
    const m = await this.membership(u);
    return (await this.db.query('SELECT a.*,e.employee_number,e.first_name,e.last_name,s.site_name,s.client_name FROM employee_assignments a JOIN employees e ON e.id=a.employee_id AND e.company_id=a.company_id JOIN client_sites s ON s.id=a.site_id AND s.company_id=a.company_id WHERE a.company_id=$1 ORDER BY a.start_date DESC', [m.companyId])).rows;
  }
  async createAssignment(u: AuthenticatedUser, d: Record<string, unknown>) {
    const m=await this.membership(u), employeeId=this.required(d.employeeId,'employeeId'), siteId=this.required(d.siteId,'siteId'), start=this.date(d.startDate,'startDate'), basis=this.required(d.payBasis,'payBasis');
    if (!['monthly','daily','hourly','per_shift'].includes(basis)) throw new BadRequestException('payBasis must be monthly, daily, hourly or per_shift.');
    const rate=this.rate(d.payRate), end=d.endDate ? this.date(d.endDate,'endDate') : null;
    if (end && end < start) throw new BadRequestException('endDate precedes startDate.');
    const row=await this.db.transaction(async c=>{
      const employee=await c.query("SELECT id FROM employees WHERE id=$1 AND company_id=$2 AND employment_status NOT IN ('terminated','inactive') FOR UPDATE",[employeeId,m.companyId]);
      if (!employee.rows.length) throw new NotFoundException('Active employee not found in this company.');
      const site=await c.query('SELECT id FROM client_sites WHERE id=$1 AND company_id=$2 AND is_active=true',[siteId,m.companyId]);
      if (!site.rows.length) throw new NotFoundException('Active site not found in this company.');
      const overlap=await c.query("SELECT id FROM employee_assignments WHERE company_id=$1 AND employee_id=$2 AND status='active' AND start_date<=COALESCE($4::date,'9999-12-31') AND COALESCE(end_date,'9999-12-31') >= $3::date FOR UPDATE",[m.companyId,employeeId,start,end]);
      if (overlap.rows.length) throw new ConflictException('Employee already has an overlapping active assignment.');
      return (await c.query('INSERT INTO employee_assignments(company_id,employee_id,site_id,assignment_title,pay_basis,pay_rate,currency,start_date,end_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::date,$9::date,$10,$11) RETURNING *',[m.companyId,employeeId,siteId,typeof d.assignmentTitle==='string'?d.assignmentTitle.trim()||null:null,basis,rate,typeof d.currency==='string'&&/^[A-Za-z]{3}$/.test(d.currency)?d.currency.toUpperCase():'KES',start,end,typeof d.notes==='string'?d.notes.trim()||null:null,u.userId])).rows[0];
    });
    await this.audit.log({userId:u.userId,companyId:m.companyId,branchId:m.branchId,action:'workforce.assignment.create',entityType:'employee_assignment',entityId:String(row.id),oldValues:null,newValues:{employeeId,siteId,payBasis:basis,payRate:rate,startDate:start},ipAddress:null}); return row;
  }
  async transfer(u: AuthenticatedUser, id: string, d: Record<string, unknown>) {
    const m=await this.membership(u), effective=this.date(d.effectiveDate,'effectiveDate'), siteId=this.required(d.siteId,'siteId'), basis=this.required(d.payBasis,'payBasis');
    if (!['monthly','daily','hourly','per_shift'].includes(basis)) throw new BadRequestException('Invalid payBasis.');
    const rate=this.rate(d.payRate);
    const row=await this.db.transaction(async c=>{
      const old=await c.query("SELECT * FROM employee_assignments WHERE id=$1 AND company_id=$2 AND status='active' FOR UPDATE",[id,m.companyId]);
      if (!old.rows.length) throw new NotFoundException('Active assignment not found.');
      const start=String(old.rows[0].start_date).slice(0,10); if (effective<start) throw new BadRequestException('Transfer date precedes assignment start.'); const scheduledEnd=old.rows[0].end_date ? String(old.rows[0].end_date).slice(0,10) : null; if (scheduledEnd && effective>scheduledEnd) throw new BadRequestException('Transfer date is after the assignment end date.');
      const site=await c.query('SELECT id FROM client_sites WHERE id=$1 AND company_id=$2 AND is_active=true',[siteId,m.companyId]);
      if (!site.rows.length) throw new NotFoundException('Active destination site not found.');
      const end=new Date(Date.parse(effective+'T00:00:00Z')-86400000).toISOString().slice(0,10);
      if (end < start) throw new BadRequestException('Transfer date cannot precede assignment start.');
      await c.query("UPDATE employee_assignments SET end_date=$2::date,status='ended',updated_at=NOW() WHERE id=$1",[id,end]);
      return (await c.query('INSERT INTO employee_assignments(company_id,employee_id,site_id,assignment_title,pay_basis,pay_rate,currency,start_date,end_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::date,$9::date,$10,$11) RETURNING *',[m.companyId,old.rows[0].employee_id,siteId,typeof d.assignmentTitle==='string'?d.assignmentTitle.trim()||old.rows[0].assignment_title:null,basis,rate,typeof d.currency==='string'&&/^[A-Za-z]{3}$/.test(d.currency)?d.currency.toUpperCase():old.rows[0].currency,effective,old.rows[0].end_date,typeof d.notes==='string'?d.notes.trim()||null:old.rows[0].notes,u.userId])).rows[0];
    });
    await this.audit.log({userId:u.userId,companyId:m.companyId,branchId:m.branchId,action:'workforce.assignment.transfer',entityType:'employee_assignment',entityId:String(row.id),oldValues:{previousAssignmentId:id},newValues:{siteId,effectiveDate:effective,payBasis:basis,payRate:rate},ipAddress:null}); return row;
  }
  async attendance(u: AuthenticatedUser, from?: string, to?: string, employeeId?: string) {
    const m=await this.membership(u), params:(string|number|boolean|Date|null)[]=[m.companyId];
    const fromDate = from ? this.date(from, 'from') : undefined;
    const toDate = to ? this.date(to, 'to') : undefined;
    if (fromDate && toDate && fromDate > toDate) throw new BadRequestException('from must be on or before to.');
    let sql='SELECT a.*,e.employee_number,e.first_name,e.last_name,s.site_name,s.client_name FROM attendance_records a JOIN employees e ON e.id=a.employee_id AND e.company_id=a.company_id LEFT JOIN employee_assignments x ON x.id=a.assignment_id AND x.company_id=a.company_id LEFT JOIN client_sites s ON s.id=x.site_id AND s.company_id=x.company_id WHERE a.company_id=$1';
    if(fromDate){params.push(fromDate);sql+=' AND a.punched_at >= $'+params.length+'::date';}
    if(toDate){params.push(toDate);sql+=' AND a.punched_at < ($'+params.length+'::date + INTERVAL \'1 day\')';}
    if(employeeId){params.push(employeeId);sql+=' AND a.employee_id=$'+params.length;}
    sql+=' ORDER BY a.punched_at DESC LIMIT 1000'; return (await this.db.query(sql,params)).rows;
  }
  async punch(u: AuthenticatedUser, d: Record<string, unknown>) {
    const m=await this.membership(u), employeeId=this.required(d.employeeId,'employeeId'), type=this.required(d.punchType,'punchType');
    if(!['in','out'].includes(type))throw new BadRequestException('punchType must be in or out.');
    const at=d.punchedAt==null?new Date():new Date(String(d.punchedAt));
    if(Number.isNaN(at.getTime())||at.getTime()>Date.now()+300000)throw new BadRequestException('Invalid punch timestamp or timestamp too far in the future.');
    const assignmentId=typeof d.assignmentId==='string'&&d.assignmentId.trim()?d.assignmentId.trim():null, ref=typeof d.externalReference==='string'?d.externalReference.trim()||null:null;
    const source=typeof d.source==='string'&&['web','mobile','qr','supervisor','import'].includes(d.source)?d.source:'web';
    try {
      const row=await this.db.transaction(async c=>{
        const employee=await c.query("SELECT id FROM employees WHERE id=$1 AND company_id=$2 AND employment_status NOT IN ('terminated','inactive') FOR UPDATE",[employeeId,m.companyId]);
        if(!employee.rows.length)throw new NotFoundException('Active employee not found in this company.');
        if(assignmentId){const a=await c.query("SELECT id FROM employee_assignments WHERE id=$1 AND company_id=$2 AND employee_id=$3 AND status='active' AND start_date<=$4::date AND (end_date IS NULL OR end_date >= $4::date)",[assignmentId,m.companyId,employeeId,at.toISOString().slice(0,10)]);if(!a.rows.length)throw new BadRequestException('Assignment is not active for this employee at punch time.');}
        const last=await c.query('SELECT punch_type,punched_at FROM attendance_records WHERE company_id=$1 AND employee_id=$2 ORDER BY punched_at DESC,id DESC LIMIT 1',[m.companyId,employeeId]);
        if(last.rows.length) {
          const lastAt = new Date(last.rows[0].punched_at as string | Date).getTime();
          if (at.getTime() <= lastAt) throw new BadRequestException('Punch timestamp must be later than the employee’s latest attendance event.');
          if(last.rows[0].punch_type===type) throw new ConflictException(type==='in'?'Employee is already clocked in.':'Employee is already clocked out.');
        }
        return (await c.query('INSERT INTO attendance_records(company_id,employee_id,assignment_id,punch_type,punched_at,source,note,external_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[m.companyId,employeeId,assignmentId,type,at,source,typeof d.note==='string'?d.note.trim()||null:null,ref,u.userId])).rows[0];
      });
      await this.audit.log({userId:u.userId,companyId:m.companyId,branchId:m.branchId,action:'workforce.attendance.punch',entityType:'attendance_record',entityId:String(row.id),oldValues:null,newValues:{employeeId,punchType:type,punchedAt:at.toISOString(),assignmentId},ipAddress:null});return row;
    } catch(e) { if((e as {code?:string}).code==='23505')throw new ConflictException('Attendance event already recorded.');throw e; }
  }
}
