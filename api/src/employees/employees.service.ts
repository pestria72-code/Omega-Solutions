import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateEmployeeDto, CreateLeaveRequestDto, ReviewLeaveRequestDto } from './dto/employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService, private readonly audit: AuditService) {}
  private async membershipFor(user: AuthenticatedUser) {
    return user.companyId ? this.memberships.getMembershipForCompany(user.userId,user.companyId) : this.memberships.getMembership(user.userId);
  }
  async list(user: AuthenticatedUser) {
    const {companyId}=await this.membershipFor(user);
    return (await this.db.query(`SELECT e.id,e.company_id,e.branch_id,b.name AS branch_name,e.employee_number,e.first_name,e.last_name,e.work_email,e.phone,e.job_title,e.department,e.employment_status,e.hire_date,e.created_at,e.updated_at
      FROM employees e LEFT JOIN branches b ON b.id=e.branch_id AND b.company_id=e.company_id
      WHERE e.company_id=$1 ORDER BY e.last_name,e.first_name`,[companyId])).rows;
  }
  async create(user: AuthenticatedUser,dto: CreateEmployeeDto) {
    const membership=await this.membershipFor(user);
    if(dto.branchId) {
      const branch=await this.db.query('SELECT id FROM branches WHERE id=$1 AND company_id=$2 AND is_active=true',[dto.branchId,membership.companyId]);
      if(!branch.rows.length) throw new BadRequestException('The branch must be active and belong to this company.');
    }
    try {
      const result=await this.db.query(`INSERT INTO employees(company_id,branch_id,employee_number,first_name,last_name,work_email,phone,job_title,department,hire_date,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11)
        RETURNING id,company_id,branch_id,employee_number,first_name,last_name,work_email,phone,job_title,department,employment_status,hire_date,created_at,updated_at`,
      [membership.companyId,dto.branchId??null,dto.employeeNumber.trim(),dto.firstName.trim(),dto.lastName.trim(),dto.workEmail?.trim().toLowerCase()??null,dto.phone?.trim()??null,dto.jobTitle?.trim()??null,dto.department?.trim()??null,dto.hireDate??null,user.userId]);
      const employee=result.rows[0];
      await this.audit.log({userId:user.userId,companyId:membership.companyId,branchId:membership.branchId,action:'employees.create',entityType:'employee',entityId:String(employee.id),oldValues:null,newValues:{employeeNumber:employee.employee_number},ipAddress:null});
      return employee;
    } catch(error) {
      if((error as {code?:string}).code==='23505') throw new ConflictException('An employee with this number already exists in this company.');
      throw error;
    }
  }
  async listLeaveRequests(user: AuthenticatedUser) {
    const {companyId}=await this.membershipFor(user);
    return (await this.db.query(`SELECT l.id,l.company_id,l.employee_id,e.employee_number,e.first_name,e.last_name,l.leave_type,l.start_date,l.end_date,l.reason,l.status,l.reviewed_by,l.reviewed_at,l.review_note,l.created_at,l.updated_at
      FROM employee_leave_requests l JOIN employees e ON e.id=l.employee_id AND e.company_id=l.company_id
      WHERE l.company_id=$1 ORDER BY l.created_at DESC`,[companyId])).rows;
  }
  async createLeaveRequest(user: AuthenticatedUser,dto: CreateLeaveRequestDto) {
    const membership=await this.membershipFor(user);
    if(dto.endDate<dto.startDate) throw new BadRequestException('Leave end date must be on or after its start date.');
    const result=await this.db.transaction(async client=>{
      const employee=await client.query('SELECT id FROM employees WHERE id=$1 AND company_id=$2 FOR UPDATE',[dto.employeeId,membership.companyId]);
      if(!employee.rows.length) throw new NotFoundException('Employee not found in this company.');
      const overlap=await client.query(`SELECT id FROM employee_leave_requests WHERE company_id=$1 AND employee_id=$2 AND status IN ('pending','approved')
        AND start_date <= $4::date AND end_date >= $3::date LIMIT 1`,[membership.companyId,dto.employeeId,dto.startDate,dto.endDate]);
      if(overlap.rows.length) throw new ConflictException('This leave request overlaps an existing pending or approved request.');
      return (await client.query(`INSERT INTO employee_leave_requests(company_id,employee_id,leave_type,start_date,end_date,reason,created_by)
        VALUES($1,$2,$3,$4::date,$5::date,$6,$7) RETURNING *`,[membership.companyId,dto.employeeId,dto.leaveType,dto.startDate,dto.endDate,dto.reason?.trim()||null,user.userId])).rows[0];
    });
    await this.audit.log({userId:user.userId,companyId:membership.companyId,branchId:membership.branchId,action:'employees.leave.create',entityType:'employee_leave_request',entityId:String(result.id),oldValues:null,newValues:{employeeId:dto.employeeId,leaveType:dto.leaveType,status:'pending'},ipAddress:null});
    return result;
  }
  async reviewLeaveRequest(user: AuthenticatedUser,id:string,dto:ReviewLeaveRequestDto) {
    const membership=await this.membershipFor(user);
    const result=await this.db.query(`UPDATE employee_leave_requests SET status=$3,reviewed_by=$4,reviewed_at=NOW(),review_note=$5,updated_at=NOW()
      WHERE id=$1 AND company_id=$2 AND status='pending' RETURNING *`,[id,membership.companyId,dto.status,user.userId,dto.reviewNote?.trim()||null]);
    if(!result.rows.length) {
      const exists=await this.db.query('SELECT id FROM employee_leave_requests WHERE id=$1 AND company_id=$2',[id,membership.companyId]);
      if(!exists.rows.length) throw new NotFoundException('Leave request not found in this company.');
      throw new ConflictException('Only pending leave requests can be reviewed.');
    }
    await this.audit.log({userId:user.userId,companyId:membership.companyId,branchId:membership.branchId,action:'employees.leave.review',entityType:'employee_leave_request',entityId:id,oldValues:{status:'pending'},newValues:{status:dto.status},ipAddress:null});
    return result.rows[0];
  }
}
