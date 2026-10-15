/**
 * Kenyan monthly payroll calculation primitives.
 * Ruleset baseline reviewed 15 October 2026. Confirm statutory rules before real payroll.
 */
export interface KenyaPayrollInput {
 grossCashPay:number; taxableBenefits?:number; employeePensionContribution?:number;
 postRetirementMedicalContribution?:number; qualifyingMortgageInterest?:number;
 insurancePremiums?:number; residentForTaxPurposes?:boolean;
}
export interface KenyaPayrollCalculation {
 grossCashPay:number; taxableBenefits:number; grossTaxableEmploymentIncome:number;
 nssfEmployee:number;nssfEmployer:number;shifEmployee:number;housingLevyEmployee:number;housingLevyEmployer:number;
 employeePensionContribution:number;pensionDeductionAllowed:number;postRetirementMedicalContribution:number;postRetirementMedicalDeduction:number;mortgageInterestDeduction:number;
 taxableIncome:number;payeBeforeReliefs:number;personalRelief:number;insuranceRelief:number;paye:number;
 employeeDeductions:number;netPay:number;employerStatutoryCost:number;
}
const roundKes=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
const money=(value:number,field:string)=>{if(!Number.isFinite(value)||value<0)throw new RangeError(`${field} must be a finite non-negative amount.`);return roundKes(value);};
export function calculateMonthlyPaye(taxableIncome:number):number{
 let remaining=money(taxableIncome,'taxableIncome'),tax=0;
 const bands:ReadonlyArray<readonly[number,number]>=[[24000,.10],[8333,.25],[467667,.30],[300000,.325],[Number.POSITIVE_INFINITY,.35]];
 for(const[width,rate]of bands){if(remaining<=0)break;const part=Math.min(remaining,width);tax+=part*rate;remaining-=part;}
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
 const grossTaxableEmploymentIncome=roundKes(grossCashPay+taxableBenefits);
 const nssfEmployee=calculateNssfYear4(grossCashPay),nssfEmployer=nssfEmployee;
 const shifEmployee=roundKes(Math.max(grossTaxableEmploymentIncome*.0275,300));
 const housingLevyEmployee=roundKes(grossCashPay*.015),housingLevyEmployer=roundKes(grossCashPay*.015);
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
 return {grossCashPay,taxableBenefits,grossTaxableEmploymentIncome,nssfEmployee,nssfEmployer,shifEmployee,housingLevyEmployee,housingLevyEmployer,employeePensionContribution,pensionDeductionAllowed,postRetirementMedicalContribution,postRetirementMedicalDeduction,mortgageInterestDeduction,taxableIncome,payeBeforeReliefs,personalRelief,insuranceRelief,paye,employeeDeductions,netPay,employerStatutoryCost};
}
