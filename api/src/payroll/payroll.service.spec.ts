import { describe, expect, it, vi } from 'vitest';
import { PayrollService } from './payroll.service.js';

describe('PayrollService tenant and workflow guards',()=>{
 it('rejects malformed periods before reading employees',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]} ,{periodStart:'not-a-date',periodEnd:'2026-10-31'})).rejects.toThrow('valid periodStart');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).not.toHaveBeenCalled();
 });
 it('rejects reversed periods before reading employees',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]} ,{periodStart:'2026-11-01',periodEnd:'2026-10-01'})).rejects.toThrow('end on or after');
 });

 it('exports tenant-scoped payroll report snapshots as CSV and protects formula-like cells',async()=>{
  const db={query:vi.fn()
   .mockResolvedValueOnce({rows:[{id:'run-a',company_id:'company-a',period_start:'2026-10-01',period_end:'2026-10-31',status:'draft',items:undefined}]})
   .mockResolvedValueOnce({rows:[{id:'item-a',employee_id:'employee-a',employee_number:'=CMD()',employee_name:'Example Employee',gross_cash_pay:'100000.00',taxable_benefits:'0.00',nssf_employee:'6000.00',nssf_employer:'6000.00',shif_employee:'2750.00',housing_levy_employee:'1500.00',housing_levy_employer:'1500.00',paye:'19308.35',pension_employee:'0.00',prmf_employee:'0.00',employee_deductions:'29558.35',net_pay:'70441.65',calculation_snapshot:{taxableIncome:86250,payeBeforeReliefs:21708.35,personalRelief:2400,insuranceRelief:0}}]})
  ,transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  const report=await service.exportRunReport({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'run-a','paye');
  expect(report.filename).toBe('omega-payroll-paye-2026-10-01.csv');
  expect(report.csv).toContain('PAYE withheld KES');
  expect(report.csv).toContain("'=CMD()");
  expect(report.disclaimer).toContain('Not an official authority filing');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).toHaveBeenCalledTimes(2);
 });
 it('rejects unsupported payroll report types before querying payroll data',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn()} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.exportRunReport({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'run-a','p10')).rejects.toThrow('Unsupported report type');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).not.toHaveBeenCalled();
 });

});
