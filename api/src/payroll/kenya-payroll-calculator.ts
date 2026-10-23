/**
 * Kenyan monthly payroll calculation primitives.
 * Statutory values are configurable by company and payroll effective date.
 * Confirm applicable rules with the relevant authority before processing payroll.
 */
export type NssfMethod = 'YEAR4' | 'LEGACY_FLAT_200' | 'CUSTOM';
export interface PayrollStatutoryOptions {
 nssfMethod?: NssfMethod;
 nssfEmployeeFlat?: number;
 nssfEmployerFlat?: number;
 nssfEmployeeRate?: number;
 nssfEmployerRate?: number;
 nssfPensionablePayCap?: number;
 housingLevyEnabled?: boolean;
 housingLevyEmployeeRate?: number;
 housingLevyEmployerRate?: number;
}
export interface KenyaPayrollInput {
 grossCashPay:number; taxableBenefits?:number; employeePensionContribution?:number;
 postRetirementMedicalContribution?:number; qualifyingMortgageInterest?:number;
 insurancePremiums?:number; residentForTaxPurposes?:boolean;
 statutoryOptions?:PayrollStatutoryOptions;
}
export interface KenyaPayrollCalculation {
 grossCashPay:number; taxableBenefits:number; grossTaxableEmploymentIncome:number;
 nssfEmployee:number;nssfEmployer:number;shifEmployee:number;housingLevyEmployee:number;housingLevyEmployer:number;
 employeePensionContribution:number;pensionDeductionAllowed:number;postRetirementMedicalContribution:number;postRetirementMedicalDeduction:number;mortgageInterestDeduction:number;
 taxableIncome:number;payeBeforeReliefs:number;personalRelief:number;insuranceRelief:number;paye:number;
 employeeDeductions:number;netPay:number;employerStatutoryCost:number;
 statutoryOptions: Required<PayrollStatutoryOptions>;
}
const roundKes=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
const money=(value:number,field:string)=>{if(!Number.isFinite(value)||value<0)throw new RangeError(`${field} must be a finite non-negative amount.`);return roundKes(value);};
const rate=(value:number|undefined,fallback:number,field:string)=>{const v=value??fallback;if(!Number.isFinite(v)||v<0||v>1)throw new RangeError(`${field} must be a rate from 0 to 1.`);return v;};
export function calculateMonthlyPaye(taxableIncome:number):number{
 let remaining=money(taxableIncome,'taxableIncome'),tax=0;
 const bands:ReadonlyArray<readonly[number,number]>=[[24000,.10],[8333,.25],[467667,.30],[300000,.325],[Number.POSITIVE_INFINITY,.35]];
 for(const[width,taxRate]of bands){if(remaining<=0)break;const part=Math.min(remaining,width);tax+=part*taxRate;remaining-=part;}
 return roundKes(tax);
}
/** NSSF Year 4: 6% on the first KES 9,000 and next KES 99,000, capped at KES 6,480 per side. */
export function calculateNssfYear4(pensionablePay:number):number{
 const pay=money(pensionablePay,'pensionablePay');
 return roundKes(Math.min(pay,9000)*.06+Math.min(Math.max(pay-9000,0),99000)*.06);
}
export function calculateKenyaMonthlyPayroll(input:KenyaPayrollInput):KenyaPayrollCalculation{
 const grossCashPay=money(input.grossCashPay,'grossCashPay');
 const taxableBenefits=money(input.taxableBenefits??0,'taxableBenefits');
 const employeePensionContribution=money(input.employeePensionContribution??0,'employeePensionContribution');
 const postRetirementMedicalContribution=money(input.postRetirementMedicalContribution??0,'postRetirementMedicalContribution');
 const qualifyingMortgageInterest=money(input.qualifyingMortgageInterest??0,'qualifyingMortgageInterest');
 const insurancePremiums=money(input.insurancePremiums??0,'insurancePremiums');
 const raw=input.statutoryOptions??{};
 const nssfMethod=raw.nssfMethod??'YEAR4';
 if(!['YEAR4','LEGACY_FLAT_200','CUSTOM'].includes(nssfMethod))throw new RangeError('Unsupported NSSF method.');
 const options:Required<PayrollStatutoryOptions>={
  nssfMethod,
  nssfEmployeeFlat:money(raw.nssfEmployeeFlat??200,'nssfEmployeeFlat'),
  nssfEmployerFlat:money(raw.nssfEmployerFlat??200,'nssfEmployerFlat'),
  nssfEmployeeRate:rate(raw.nssfEmployeeRate,.06,'nssfEmployeeRate'),
  nssfEmployerRate:rate(raw.nssfEmployerRate,.06,'nssfEmployerRate'),
  nssfPensionablePayCap:money(raw.nssfPensionablePayCap??108000,'nssfPensionablePayCap'),
  housingLevyEnabled:raw.housingLevyEnabled as boolean,
  housingLevyEmployeeRate:rate(raw.housingLevyEmployeeRate,.015,'housingLevyEmployeeRate'),
  housingLevyEmployerRate:rate(raw.housingLevyEmployerRate,.015,'housingLevyEmployerRate'),
 };
 if(typeof options.housingLevyEnabled!=='boolean')throw new RangeError('housingLevyEnabled must be a boolean.');
 let nssfEmployee=0,nssfEmployer=0;
 if(nssfMethod==='YEAR4'){nssfEmployee=calculateNssfYear4(grossCashPay);nssfEmployer=nssfEmployee;}
 else if(nssfMethod==='LEGACY_FLAT_200'){nssfEmployee=Math.min(grossCashPay,options.nssfEmployeeFlat);nssfEmployer=Math.min(grossCashPay,options.nssfEmployerFlat);}
 else {nssfEmployee=roundKes(Math.min(grossCashPay,options.nssfPensionablePayCap)*options.nssfEmployeeRate);nssfEmployer=roundKes(Math.min(grossCashPay,options.nssfPensionablePayCap)*options.nssfEmployerRate);}
 const grossTaxableEmploymentIncome=roundKes(grossCashPay+taxableBenefits);
 const shifEmployee=roundKes(Math.max(grossTaxableEmploymentIncome*.0275,300));
 const housingLevyEmployee=options.housingLevyEnabled?roundKes(grossCashPay*options.housingLevyEmployeeRate):0;
 const housingLevyEmployer=options.housingLevyEnabled?roundKes(grossCashPay*options.housingLevyEmployerRate):0;
 const pensionDeductionAllowed=roundKes(Math.min(nssfEmployee+employeePensionContribution,30000));
 const postRetirementMedicalDeduction=roundKes(Math.min(postRetirementMedicalContribution,15000));
 const mortgageInterestDeduction=roundKes(Math.min(qualifyingMortgageInterest,30000));
 const taxableIncome=roundKes(Math.max(0,grossTaxableEmploymentIncome-housingLevyEmployee-shifEmployee-pensionDeductionAllowed-postRetirementMedicalDeduction-mortgageInterestDeduction));
 const payeBeforeReliefs=calculateMonthlyPaye(taxableIncome);
 const resident=input.residentForTaxPurposes!==false;
 const personalRelief=resident?2400:0;
 const insuranceRelief=resident?roundKes(Math.min(insurancePremiums*.15,5000)):0;
 const paye=roundKes(Math.max(0,payeBeforeReliefs-personalRelief-insuranceRelief));
 const employeeDeductions=roundKes(nssfEmployee+shifEmployee+housingLevyEmployee+paye+employeePensionContribution+postRetirementMedicalContribution);
 const netPay=roundKes(grossCashPay-employeeDeductions);
 const employerStatutoryCost=roundKes(nssfEmployer+housingLevyEmployer);
 return {grossCashPay,taxableBenefits,grossTaxableEmploymentIncome,nssfEmployee,nssfEmployer,shifEmployee,housingLevyEmployee,housingLevyEmployer,employeePensionContribution,pensionDeductionAllowed,postRetirementMedicalContribution,postRetirementMedicalDeduction,mortgageInterestDeduction,taxableIncome,payeBeforeReliefs,personalRelief,insuranceRelief,paye,employeeDeductions,netPay,employerStatutoryCost,statutoryOptions:options};
}
