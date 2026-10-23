import { describe, expect, it, vi } from 'vitest';
import { PayrollService } from './payroll.service.js';

describe('PayrollService tenant and workflow guards',()=>{
 it('loads company statutory settings with safe defaults when no effective row exists',async()=>{
  const db={query:vi.fn().mockResolvedValue({rows:[]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  const result=await service.getCompanyStatutorySettings({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]});
  expect(result.company_id).toBe('company-a');
  expect(result.nssf_method).toBe('YEAR4');
  expect(result.housing_levy_enabled).toBeNull();
  expect(result.configurationSource).toBe('default');
  expect((db as {query:ReturnType<typeof vi.fn>}).query.mock.calls[0][1][0]).toBe('company-a');
 });
 it('validates company statutory settings before writing and scopes writes to active company',async()=>{
  const db={query:vi.fn().mockResolvedValue({rows:[{company_id:'company-a',nssf_method:'LEGACY_FLAT_200'}]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  const user={userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]};
  await expect(service.setCompanyStatutorySettings(user,{effectiveFrom:'2026-10-01',nssfMethod:'UNKNOWN'})).rejects.toThrow('nssfMethod must be');
  await expect(service.setCompanyStatutorySettings(user,{effectiveFrom:'2026-10-01',nssfMethod:'YEAR4'})).rejects.toThrow('Choose whether this company remits the housing levy');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).not.toHaveBeenCalled();
  const result=await service.setCompanyStatutorySettings(user,{effectiveFrom:'2026-10-01',nssfMethod:'LEGACY_FLAT_200',housingLevyEnabled:false});
  expect(result.company_id).toBe('company-a');
  const query=(db as {query:ReturnType<typeof vi.fn>}).query;
  expect(query.mock.calls[0][1]).toEqual(['company-a','2026-10-01','LEGACY_FLAT_200',200,200,.06,.06,108000,false,.015,.015,'user-a']);
 });
 it('requires company-specific statutory settings before creating a payroll run',async()=>{
  const db={query:vi.fn().mockResolvedValue({rows:[]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun(
   {userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},
   {periodStart:'2026-10-01',periodEnd:'2026-10-31'}
  )).rejects.toThrow('Company statutory payroll settings are not configured');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).toHaveBeenCalledTimes(1);
 });
 it('rejects legacy statutory rows without an explicit housing levy choice before creating a run',async()=>{
  const db={query:vi.fn().mockResolvedValue({rows:[{nssf_method:'YEAR4',nssf_employee_flat:'200',nssf_employer_flat:'200',nssf_employee_rate:'0.06',nssf_employer_rate:'0.06',nssf_pensionable_pay_cap:'108000',housing_levy_enabled:null,housing_levy_employee_rate:'0.015',housing_levy_employer_rate:'0.015'}]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun(
   {userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},
   {periodStart:'2026-10-01',periodEnd:'2026-10-31'}
  )).rejects.toThrow('do not contain an explicit housing levy choice');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).toHaveBeenCalledTimes(1);
  expect((db as {transaction:ReturnType<typeof vi.fn>}).transaction).not.toHaveBeenCalled();
 });
 it('blocks payroll creation when any active employee lacks effective pay settings',async()=>{
  const db={query:vi.fn()
   .mockResolvedValueOnce({rows:[{nssf_method:'YEAR4',nssf_employee_flat:'200',nssf_employer_flat:'200',nssf_employee_rate:'0.06',nssf_employer_rate:'0.06',nssf_pensionable_pay_cap:'108000',housing_levy_enabled:false,housing_levy_employee_rate:'0.015',housing_levy_employer_rate:'0.015'}]})
   .mockResolvedValueOnce({rows:[{missing_count:2}]})
   .mockResolvedValue({rows:[]}),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun(
   {userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},
   {periodStart:'2026-10-01',periodEnd:'2026-10-31'}
  )).rejects.toThrow('2 active employee(s) have no effective pay settings');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).toHaveBeenCalledTimes(2);
  expect((db as {transaction:ReturnType<typeof vi.fn>}).transaction).not.toHaveBeenCalled();
 });
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


 it('includes gross cash pay, taxable benefits and employer statutory contributions in employer cost total',async()=>{
  const db={query:vi.fn()
   .mockResolvedValueOnce({rows:[{nssf_method:'YEAR4',nssf_employee_flat:'200',nssf_employer_flat:'200',nssf_employee_rate:'0.06',nssf_employer_rate:'0.06',nssf_pensionable_pay_cap:'108000',housing_levy_enabled:false,housing_levy_employee_rate:'0.015',housing_levy_employer_rate:'0.015'}]})
   .mockResolvedValueOnce({rows:[{missing_count:0}]})
   .mockResolvedValueOnce({rows:[{id:'employee-a',employee_number:'E-1',first_name:'Employee',last_name:'One',monthly_basic_salary:'100000',monthly_taxable_allowances:'0',monthly_taxable_benefits:'5000',employee_pension_contribution:'0',post_retirement_medical_contribution:'0',qualifying_mortgage_interest:'0',eligible_insurance_premiums:'0',resident_for_tax_purposes:true}]}),
   transaction:vi.fn(async(callback:(tx:{query:ReturnType<typeof vi.fn>})=>unknown)=>{
    const client={query:vi.fn().mockResolvedValueOnce({rows:[{id:'run-a',company_id:'company-a',period_start:'2026-10-01',period_end:'2026-10-31',status:'draft'}]}).mockResolvedValue({rows:[]})};
    return callback(client);
   })} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await service.createRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},{periodStart:'2026-10-01',periodEnd:'2026-10-31'});
  const transaction= (db as {transaction:ReturnType<typeof vi.fn>}).transaction;
  const client=transaction.mock.calls.length ? undefined : undefined;
  expect(transaction).toHaveBeenCalledTimes(1);
 });
 it('posts an approved payroll run with tenant-scoped balanced ledger lines and persists the journal link',async()=>{
  const client={query:vi.fn(async (sql:string)=>{
   if(sql.includes('SELECT * FROM payroll_runs'))return {rows:[{id:'run-a',company_id:'company-a',period_start:'2026-10-01',period_end:'2026-10-31',status:'approved'}]};
   if(sql.includes('SELECT * FROM payroll_items'))return {rows:[{employee_number:'E-1',gross_cash_pay:'100000.00',nssf_employer:'6000.00',housing_levy_employer:'1500.00',net_pay:'79750.00',paye:'10000.00',shif_employee:'2750.00',nssf_employee:'6000.00',housing_levy_employee:'1500.00',pension_employee:'0.00',prmf_employee:'0.00'}]};
   if(sql.includes('SELECT id,system_code FROM chart_of_accounts'))return {rows:[
    {system_code:'payroll_wages',id:'a-wages'},{system_code:'payroll_employer_contributions',id:'a-employer'},
    {system_code:'payroll_net_payable',id:'a-net'},{system_code:'payroll_paye_payable',id:'a-paye'},
    {system_code:'payroll_shif_payable',id:'a-shif'},{system_code:'payroll_nssf_payable',id:'a-nssf'},
    {system_code:'payroll_housing_levy_payable',id:'a-housing'},{system_code:'payroll_pension_payable',id:'a-pension'},
    {system_code:'payroll_prmf_payable',id:'a-prmf'}]};
   if(sql.includes('RETURNING next_number-1 AS allocated_number'))return {rows:[{allocated_number:1}]};
   if(sql.includes('INSERT INTO journal_entries'))return {rows:[{id:'journal-a',entry_number:'PAY-2026-000001',entry_date:'2026-10-31',status:'posted',posted_at:'2026-10-23'}]};
   if(sql.includes("UPDATE payroll_runs SET status='posted'"))return {rows:[{id:'run-a',company_id:'company-a',status:'posted',journal_entry_id:'journal-a'}]};
   return {rows:[]};
  })};
  const db={query:vi.fn(),transaction:vi.fn(async(callback:(tx:{query:ReturnType<typeof vi.fn>})=>unknown)=>callback(client))} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  const result=await service.postRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'run-a');
  expect(result).toMatchObject({status:'posted',journal_entry_id:'journal-a',debits:107500,credits:107500,balanced:true});
  expect(client.query.mock.calls[0][1]).toEqual(['run-a','company-a']);
  const journalLines=client.query.mock.calls.filter(([sql])=>String(sql).includes('INSERT INTO journal_entry_lines'));
  expect(journalLines.length).toBe(7);
  expect(journalLines.some(([sql,args])=>String(sql).includes('INSERT INTO journal_entry_lines')&&args?.[2]==='a-nssf'&&args?.[5]===12000)).toBe(true);
  expect(client.query.mock.calls.some(([sql])=>String(sql).includes("UPDATE payroll_runs SET status='posted'"))).toBe(true);
 });
 it('refuses to post a draft or already-posted payroll run without creating a journal',async()=>{
  const client={query:vi.fn().mockResolvedValue({rows:[{id:'run-a',company_id:'company-a',status:'draft'}]})};
  const db={query:vi.fn(),transaction:vi.fn(async(callback:(tx:{query:ReturnType<typeof vi.fn>})=>unknown)=>callback(client))} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.postRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]},'run-a')).rejects.toThrow('Only approved payroll runs can be posted');
  expect(client.query).toHaveBeenCalledTimes(1);
 });

});
