import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

describe('EmployeesService',()=>{
 const user:AuthenticatedUser={userId:'user-1',email:'owner@example.test',fullName:'Owner',companyId:'company-1',branchId:null,role:'owner',permissions:['employees:read','employees:write']};
 let db:{query:ReturnType<typeof vi.fn>;transaction:ReturnType<typeof vi.fn>};
 let memberships:{getMembership:ReturnType<typeof vi.fn>;getMembershipForCompany:ReturnType<typeof vi.fn>};
 let audit:{log:ReturnType<typeof vi.fn>};
 let service:EmployeesService;
 beforeEach(()=>{
  db={query:vi.fn(),transaction:vi.fn()};
  db.transaction.mockImplementation(async(callback:(client:unknown)=>Promise<unknown>)=>callback({query:db.query}));
  const membership={companyId:'company-1',branchId:null,role:'owner'};
  memberships={getMembership:vi.fn().mockResolvedValue(membership),getMembershipForCompany:vi.fn().mockResolvedValue(membership)};
  audit={log:vi.fn().mockResolvedValue(undefined)};
  service=new EmployeesService(db as unknown as DatabaseService,memberships as unknown as MembershipsService,audit as unknown as AuditService);
 });
 it('lists employees only within the active company',async()=>{
  db.query.mockResolvedValue({rows:[],rowCount:0});
  await service.list(user);
  expect(memberships.getMembershipForCompany).toHaveBeenCalledWith('user-1','company-1');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE e.company_id=$1'),['company-1']);
 });
 it('rejects a branch from another company before creating an employee',async()=>{
  db.query.mockResolvedValue({rows:[],rowCount:0});
  await expect(service.create(user,{employeeNumber:'EMP-1',firstName:'Amina',lastName:'Otieno',branchId:'foreign-branch'})).rejects.toThrow(BadRequestException);
  expect(db.query).toHaveBeenCalledTimes(1);
  expect(audit.log).not.toHaveBeenCalled();
 });
 it('rejects overlapping pending or approved leave requests',async()=>{
  const client={query:vi.fn().mockImplementation(async(sql:string)=>{
   if(sql.includes('SELECT id FROM employees'))return {rows:[{id:'employee-1'}],rowCount:1};
   if(sql.includes('SELECT id FROM employee_leave_requests'))return {rows:[{id:'existing-leave'}],rowCount:1};
   return {rows:[],rowCount:1};
  })};
  db.transaction.mockImplementation(async(callback:(client:unknown)=>Promise<unknown>)=>callback(client));
  await expect(service.createLeaveRequest(user,{employeeId:'employee-1',leaveType:'annual',startDate:'2026-11-02',endDate:'2026-11-05'})).rejects.toThrow(ConflictException);
  expect(client.query).toHaveBeenCalledTimes(2);
  expect(audit.log).not.toHaveBeenCalled();
 });
 it('rejects leave requests whose end date precedes their start date',async()=>{
  await expect(service.createLeaveRequest(user,{employeeId:'employee-1',leaveType:'annual',startDate:'2026-11-05',endDate:'2026-11-02'})).rejects.toThrow(BadRequestException);
  expect(db.transaction).not.toHaveBeenCalled();
 });
 it('does not review a leave request twice',async()=>{
  db.query.mockResolvedValueOnce({rows:[],rowCount:0}).mockResolvedValueOnce({rows:[{id:'leave-1'}],rowCount:1});
  await expect(service.reviewLeaveRequest(user,'leave-1',{status:'approved'})).rejects.toThrow(ConflictException);
  expect(audit.log).not.toHaveBeenCalled();
 });
 it('returns not found for a leave request in another company',async()=>{
  db.query.mockResolvedValueOnce({rows:[],rowCount:0}).mockResolvedValueOnce({rows:[],rowCount:0});
  await expect(service.reviewLeaveRequest(user,'foreign-leave',{status:'approved'})).rejects.toThrow(NotFoundException);
 });
});
