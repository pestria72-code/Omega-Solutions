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


 it('exports annual tax summaries from posted payroll runs within the active company',async()=>{
  const db={query:vi.fn().mockResolvedValue({rows:[{employee_number:'E-1',employee_name:'Employee One',posted_pay_periods:12,gross_cash_pay:'1200000.00',taxable_benefits:'0.00',paye_withheld:'220000.00',employee_nssf:'72000.00',employer_nssf:'72000.00',shif_contributions:'33000.00',employee_housing_levy:'18000.00',employer_housing_levy:'18000.00',employee_pension:'0.00',post_retirement_medical:'0.00',total_employee_deductions:'343000.00',net_cash_pay:'857000.00'}]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  const report=await service.exportAnnualTaxSummary({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'2026');
  expect(report.filename).toBe('omega-annual-tax-summary-2026.csv');
  expect(report.csv).toContain('Employee One');
  expect(report.csv).toContain('220000.00');
  expect(report.payrollRunsIncluded).toBe('posted only');
  expect(report.disclaimer).toContain('not an official KRA P9/P9A');
  const query=(db as {query:ReturnType<typeof vi.fn>}).query;
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0][1]).toEqual(['company-a','2026-01-01']);
  expect(query.mock.calls[0][0]).toContain("r.status='posted'");
 });
 it('rejects annual tax summary years without verified historical payroll rules',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn()} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.exportAnnualTaxSummary({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'2025')).rejects.toThrow('Earlier years require verified historical statutory rules');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).not.toHaveBeenCalled();
 });

});
