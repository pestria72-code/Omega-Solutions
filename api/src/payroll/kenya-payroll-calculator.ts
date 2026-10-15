/**
 * Kenyan monthly payroll calculation primitives.
 *
 * Rates are effective from 1 February 2026 for NSSF Year 4 and reflect the
 * KRA PAYE bands currently published for monthly employment income. Keep this
 * engine pure and versioned: statutory rules must be reviewed before each tax
 * year and payroll must not be posted until an authorised reviewer approves it.
 */
export interface KenyaPayrollInput {
  grossCashPay: number;
  taxableBenefits?: number;
  employeePensionContribution?: number;
  postRetirementMedicalContribution?: number;
  qualifyingMortgageInterest?: number;
  insurancePremiums?: number;
  residentForTaxPurposes?: boolean;
}

export interface KenyaPayrollCalculation {
  grossCashPay: number;
  taxableBenefits: number;
  grossTaxableEmploymentIncome: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shifEmployee: number;
  housingLevyEmployee: number;
  housingLevyEmployer: number;
  employeePensionContribution: number;
  pensionDeductionAllowed: number;
  postRetirementMedicalDeduction: number;
  mortgageInterestDeduction: number;
  taxableIncome: number;
  payeBeforeReliefs: number;
  personalRelief: number;
  insuranceRelief: number;
  paye: number;
  employeeDeductions: number;
  netPay: number;
  employerStatutoryCost: number;
}

const roundKes = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const money = (value: number, field: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${field} must be a finite non-negative amount.`);
  return roundKes(value);
};

/** Progressive monthly PAYE bands published by KRA, effective 1 July 2023. */
export function calculateMonthlyPaye(taxableIncome: number): number {
  const income = money(taxableIncome, 'taxableIncome');
  const bands: ReadonlyArray<readonly [number, number]> = [
    [24_000, 0.10],
    [8_333, 0.25],
    [467_667, 0.30],
    [300_000, 0.325],
    [Number.POSITIVE_INFINITY, 0.35],
  ];
  let remaining = income;
  let tax = 0;
  for (const [bandWidth, rate] of bands) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, bandWidth);
    tax += taxableInBand * rate;
    remaining -= taxableInBand;
  }
  return roundKes(tax);
}

/** NSSF Year 4 employee/employer contribution, effective February 2026. */
export function calculateNssfYear4(pensionablePay: number): number {
  const pay = money(pensionablePay, 'pensionablePay');
  const tierOne = Math.min(pay, 9_000) * 0.06;
  const tierTwo = Math.min(Math.max(pay - 9_000, 0), 99_000) * 0.06;
  return roundKes(tierOne + tierTwo);
}

/**
 * Calculate a standard monthly payroll itemisation. Variable pay, taxable
 * benefits, relief eligibility and deductions must be entered explicitly;
 * this function deliberately does not infer them from an employee record.
 */
export function calculateKenyaMonthlyPayroll(input: KenyaPayrollInput): KenyaPayrollCalculation {
  const grossCashPay = money(input.grossCashPay, 'grossCashPay');
  const taxableBenefits = money(input.taxableBenefits ?? 0, 'taxableBenefits');
  const employeePensionContribution = money(input.employeePensionContribution ?? 0, 'employeePensionContribution');
  const postRetirementMedicalContribution = money(input.postRetirementMedicalContribution ?? 0, 'postRetirementMedicalContribution');
  const qualifyingMortgageInterest = money(input.qualifyingMortgageInterest ?? 0, 'qualifyingMortgageInterest');
  const insurancePremiums = money(input.insurancePremiums ?? 0, 'insurancePremiums');

  const grossTaxableEmploymentIncome = roundKes(grossCashPay + taxableBenefits);
  const nssfEmployee = calculateNssfYear4(grossCashPay);
  const nssfEmployer = nssfEmployee;
  const shifEmployee = roundKes(Math.max(grossTaxableEmploymentIncome * 0.0275, 300));
  const housingLevyEmployee = roundKes(grossCashPay * 0.015);
  const housingLevyEmployer = roundKes(grossCashPay * 0.015);

  // KRA's registered pension/provident deduction ceiling is KES 30,000 monthly.
  // Employee NSSF is included in the pension ceiling; avoid double-deducting it.
  const pensionDeductionAllowed = roundKes(Math.min(nssfEmployee + employeePensionContribution, 30_000));
  const postRetirementMedicalDeduction = roundKes(Math.min(postRetirementMedicalContribution, 15_000));
  const mortgageInterestDeduction = roundKes(Math.min(qualifyingMortgageInterest, 30_000));
  const taxableIncome = roundKes(Math.max(0,
    grossTaxableEmploymentIncome - housingLevyEmployee - shifEmployee -
    pensionDeductionAllowed - postRetirementMedicalDeduction - mortgageInterestDeduction,
  ));
  const payeBeforeReliefs = calculateMonthlyPaye(taxableIncome);
  const personalRelief = input.residentForTaxPurposes === false ? 0 : 2_400;
  const insuranceRelief = roundKes(Math.min(insurancePremiums * 0.15, 5_000));
  const paye = roundKes(Math.max(0, payeBeforeReliefs - personalRelief - insuranceRelief));
  const employeeDeductions = roundKes(nssfEmployee + shifEmployee + housingLevyEmployee + paye);
  const netPay = roundKes(grossCashPay - employeeDeductions);
  const employerStatutoryCost = roundKes(nssfEmployer + housingLevyEmployer);

  return {
    grossCashPay, taxableBenefits, grossTaxableEmploymentIncome, nssfEmployee, nssfEmployer,
    shifEmployee, housingLevyEmployee, housingLevyEmployer, employeePensionContribution,
    pensionDeductionAllowed, postRetirementMedicalDeduction, mortgageInterestDeduction,
    taxableIncome, payeBeforeReliefs, personalRelief, insuranceRelief, paye,
    employeeDeductions, netPay, employerStatutoryCost,
  };
}
