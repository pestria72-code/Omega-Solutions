import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { calculateKenyaMonthlyPayroll } from './kenya-payroll-calculator.js';

interface PayEmployee {
 id:string;employee_number:string;first_name:string;last_name:string;
 monthly_basic_salary:string|number;monthly_taxable_allowances:string|number;monthly_taxable_benefits:string|number;
 employee_pension_contribution:string|number;post_retirement_medical_contribution:string|number;
 qualifying_mortgage_interest:string|number;eligible_insurance_premiums:string|number;resident_for_tax_purposes:boolean;
}
const amount=(value:string|number)=>Math.round(Number(value)*100)/100;
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const payFields=['monthlyBasicSalary','monthlyTaxableAllowances','monthlyTaxableBenefits','employeePensionContribution','postRetirementMedicalContribution','qualifyingMortgageInterest','eligibleInsurancePremiums'] as const;

@Injectable()
export class PayrollService {
 constructor(private readonly db:DatabaseService,private readonly memberships:MembershipsService){}
 private membershipFor(user:AuthenticatedUser){return user.companyId?this.memberships.getMembershipForCompany(user.userId,user.companyId):this.memberships.getMembership(user.userId);}
 async getEmployeePaySettings(user:AuthenticatedUser,employeeId:string){
  const {companyId}=await this.membershipFor(user);
  const result=await this.db.query(`SELECT s.id,s.company_id,s.employee_id,s.monthly_basic_salary,s.monthly_taxable_allowances,s.monthly_taxable_benefits,s.employee_pension_contribution,s.post_retirement_medical_contribution,s.qualifying_mortgage_interest,s.eligible_insurance_premiums,s.resident_for_tax_purposes,s.effective_from,s.created_at,s.updated_at
   FROM employee_pay_settings s JOIN employees e ON e.id=s.employee_id AND e.company_id=s.company_id
   WHERE s.employee_id=$1 AND s.company_id=$2`,[employeeId,companyId]);
  if(!result.rows.length)throw new NotFoundException('Pay settings not found for this employee in this company.');
  return result.rows[0];
 }
 async setEmployeePaySettings(user:AuthenticatedUser,employeeId:string,dto:Record<string,unknown>){
  const {companyId}=await this.membershipFor(user);
  const employee=await this.db.query('SELECT id FROM employees WHERE id=$1 AND company_id=$2',[employeeId,companyId]);
  if(!employee.rows.length)throw new NotFoundException('Employee not found in this company.');
  const keys=['monthlyBasicSalary','monthlyTaxableAllowances','monthlyTaxableBenefits','employeePensionContribution','postRetirementMedicalContribution','qualifyingMortgageInterest','eligibleInsurancePremiums'];
  for(const key of keys){
   const value=dto[key]===undefined?(key==='monthlyBasicSalary'?undefined:0):dto[key];
   if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new BadRequestException(`${key} must be a finite non-negative number.`);
  }
  if(dto.residentForTaxPurposes!==undefined&&typeof dto.residentForTaxPurposes!=='boolean')throw new BadRequestException('residentForTaxPurposes must be a boolean.');
  const effectiveFrom=dto.effectiveFrom===undefined?new Date().toISOString().slice(0,10):dto.effectiveFrom;
  if(typeof effectiveFrom!=='string'||!validDate(effectiveFrom))throw new BadRequestException('effectiveFrom must be a valid YYYY-MM-DD date.');
  const values=keys.map(key=>dto[key]===undefined?0:dto[key] as number);
  const result=await this.db.query(`INSERT INTO employee_pay_settings(company_id,employee_id,monthly_basic_salary,monthly_taxable_allowances,monthly_taxable_benefits,employee_pension_contribution,post_retirement_medical_contribution,qualifying_mortgage_interest,eligible_insurance_premiums,resident_for_tax_purposes,effective_from,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12)
   ON CONFLICT(company_id,employee_id) DO UPDATE SET monthly_basic_salary=EXCLUDED.monthly_basic_salary,monthly_taxable_allowances=EXCLUDED.monthly_taxable_allowances,monthly_taxable_benefits=EXCLUDED.monthly_taxable_benefits,employee_pension_contribution=EXCLUDED.employee_pension_contribution,post_retirement_medical_contribution=EXCLUDED.post_retirement_medical_contribution,qualifying_mortgage_interest=EXCLUDED.qualifying_mortgage_interest,eligible_insurance_premiums=EXCLUDED.eligible_insurance_premiums,resident_for_tax_purposes=EXCLUDED.resident_for_tax_purposes,effective_from=EXCLUDED.effective_from,updated_at=NOW()
   RETURNING id,company_id,employee_id,monthly_basic_salary,monthly_taxable_allowances,monthly_taxable_benefits,employee_pension_contribution,post_retirement_medical_contribution,qualifying_mortgage_interest,eligible_insurance_premiums,resident_for_tax_purposes,effective_from,created_at,updated_at`,
   [companyId,employeeId,...values,dto.residentForTaxPurposes===false?false:true,effectiveFrom,user.userId]);
  return result.rows[0];
 }
 async listRuns(user:AuthenticatedUser){
  const {companyId}=await this.membershipFor(user);
  return (await this.db.query(`SELECT id,company_id,period_start,period_end,status,employee_count,gross_total,employee_deductions_total,net_pay_total,employer_cost_total,journal_entry_id,created_at,approved_at,posted_at
   FROM payroll_runs WHERE company_id=$1 ORDER BY period_start DESC,created_at DESC`,[companyId])).rows;
 }
 async getRun(user:AuthenticatedUser,id:string){
  const {companyId}=await this.membershipFor(user);
  const run=await this.db.query(`SELECT id,company_id,period_start,period_end,status,employee_count,gross_total,employee_deductions_total,net_pay_total,employer_cost_total,journal_entry_id,created_at,approved_at,posted_at
   FROM payroll_runs WHERE id=$1 AND company_id=$2`,[id,companyId]);
  if(!run.rows.length)throw new NotFoundException('Payroll run not found in this company.');
  const items=await this.db.query(`SELECT id,employee_id,employee_number,employee_name,gross_cash_pay,taxable_benefits,nssf_employee,nssf_employer,shif_employee,housing_levy_employee,housing_levy_employer,paye,pension_employee,prmf_employee,employee_deductions,net_pay,employer_statutory_cost,calculation_snapshot
   FROM payroll_items WHERE payroll_run_id=$1 AND company_id=$2 ORDER BY employee_name`,[id,companyId]);
  return {...run.rows[0],items:items.rows};
 }
 async createRun(user:AuthenticatedUser,dto:{periodStart:string;periodEnd:string}){
  const membership=await this.membershipFor(user);
  if(!validDate(dto.periodStart)||!validDate(dto.periodEnd)||dto.periodEnd<dto.periodStart)throw new BadRequestException('Provide a valid periodStart and periodEnd (YYYY-MM-DD), with the end on or after the start.');
  const employees=await this.db.query<PayEmployee>(`SELECT e.id,e.employee_number,e.first_name,e.last_name,
    s.monthly_basic_salary,s.monthly_taxable_allowances,s.monthly_taxable_benefits,s.employee_pension_contribution,
    s.post_retirement_medical_contribution,s.qualifying_mortgage_interest,s.eligible_insurance_premiums,s.resident_for_tax_purposes
    FROM employees e JOIN employee_pay_settings s ON s.employee_id=e.id AND s.company_id=e.company_id
    WHERE e.company_id=$1 AND e.employment_status='active' AND s.effective_from <= $2::date
    ORDER BY e.employee_number`,[membership.companyId,dto.periodEnd]);
  if(!employees.rows.length)throw new BadRequestException('No active employees have effective pay settings. Configure employee pay before preparing a payroll run.');
  const calculated=employees.rows.map(employee=>{
    const grossCashPay=amount(employee.monthly_basic_salary)+amount(employee.monthly_taxable_allowances);
    const snapshot=calculateKenyaMonthlyPayroll({grossCashPay,taxableBenefits:amount(employee.monthly_taxable_benefits),
      employeePensionContribution:amount(employee.employee_pension_contribution),
      postRetirementMedicalContribution:amount(employee.post_retirement_medical_contribution),
      qualifyingMortgageInterest:amount(employee.qualifying_mortgage_interest),
      insurancePremiums:amount(employee.eligible_insurance_premiums),
      residentForTaxPurposes:employee.resident_for_tax_purposes});
    if(snapshot.netPay<0)throw new BadRequestException(`Calculated net pay is negative for employee ${employee.employee_number}; review their pay settings.`);
    return {employee,snapshot,grossCashPay};
  });
  try {
   return await this.db.transaction(async client=>{
    const inserted=await client.query(`INSERT INTO payroll_runs(company_id,period_start,period_end,status,employee_count,gross_total,employee_deductions_total,net_pay_total,employer_cost_total,created_by)
     VALUES($1,$2::date,$3::date,'draft',$4,$5,$6,$7,$8,$9) RETURNING id,company_id,period_start,period_end,status,employee_count,gross_total,employee_deductions_total,net_pay_total,employer_cost_total,created_at`,
    [membership.companyId,dto.periodStart,dto.periodEnd,calculated.length,
     calculated.reduce((s,x)=>s+x.grossCashPay+x.snapshot.taxableBenefits,0),
     calculated.reduce((s,x)=>s+x.snapshot.employeeDeductions,0),
     calculated.reduce((s,x)=>s+x.snapshot.netPay,0),
     calculated.reduce((s,x)=>s+x.snapshot.employerStatutoryCost,0),user.userId]);
    const run=inserted.rows[0];
    for(const {employee,snapshot,grossCashPay} of calculated){
      await client.query(`INSERT INTO payroll_items(company_id,payroll_run_id,employee_id,employee_number,employee_name,gross_cash_pay,taxable_benefits,nssf_employee,nssf_employer,shif_employee,housing_levy_employee,housing_levy_employer,paye,pension_employee,prmf_employee,employee_deductions,net_pay,employer_statutory_cost,calculation_snapshot)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb)`,
      [membership.companyId,run.id,employee.id,employee.employee_number,`${employee.first_name} ${employee.last_name}`,grossCashPay,snapshot.taxableBenefits,snapshot.nssfEmployee,snapshot.nssfEmployer,snapshot.shifEmployee,snapshot.housingLevyEmployee,snapshot.housingLevyEmployer,snapshot.paye,snapshot.employeePensionContribution,snapshot.postRetirementMedicalDeduction,snapshot.employeeDeductions,snapshot.netPay,snapshot.employerStatutoryCost,JSON.stringify(snapshot)]);
    }
    return run;
   });
  }catch(error){if((error as {code?:string}).code==='23505')throw new ConflictException('A payroll run already exists for this company and period.');throw error;}
 }
 async approveRun(user:AuthenticatedUser,id:string){
  const membership=await this.membershipFor(user);
  return this.db.transaction(async client=>{
   const run=await client.query(`SELECT * FROM payroll_runs WHERE id=$1 AND company_id=$2 FOR UPDATE`,[id,membership.companyId]);
   if(!run.rows.length)throw new NotFoundException('Payroll run not found in this company.');
   if(run.rows[0].status!=='draft')throw new ConflictException('Only draft payroll runs can be approved.');
   const items=await client.query(`SELECT id FROM payroll_items WHERE payroll_run_id=$1 AND company_id=$2 FOR UPDATE`,[id,membership.companyId]);
   if(!items.rows.length)throw new BadRequestException('Payroll run has no employee items.');
   const updated=await client.query(`UPDATE payroll_runs SET status='approved',approved_by=$3,approved_at=NOW(),updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status='draft'
    RETURNING id,company_id,period_start,period_end,status,employee_count,gross_total,employee_deductions_total,net_pay_total,employer_cost_total,approved_by,approved_at`,[id,membership.companyId,user.userId]);
   return updated.rows[0];
  });
 }
}
