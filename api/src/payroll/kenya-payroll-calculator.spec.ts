import { describe, expect, it } from 'vitest';
import {
  calculateKenyaMonthlyPayroll,
  calculateMonthlyPaye,
  calculateNssfYear4,
} from './kenya-payroll-calculator.js';

describe('Kenyan monthly payroll rules', () => {
  it('applies progressive PAYE bands without personal relief', () => {
    expect(calculateMonthlyPaye(24_000)).toBe(2_400);
    expect(calculateMonthlyPaye(32_333)).toBe(4_483.25);
    expect(calculateMonthlyPaye(800_000)).toBe(242_283.35);
    expect(calculateMonthlyPaye(900_000)).toBe(277_283.35);
  });

  it('applies NSSF Year 4 tiers and the monthly cap from February 2026', () => {
    expect(calculateNssfYear4(8_000)).toBe(480);
    expect(calculateNssfYear4(9_000)).toBe(540);
    expect(calculateNssfYear4(15_000)).toBe(900);
    expect(calculateNssfYear4(108_000)).toBe(6_480);
    expect(calculateNssfYear4(250_000)).toBe(6_480);
  });

  it('calculates statutory deductions and resident PAYE relief transparently', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 100_000 });
    expect(result.nssfEmployee).toBe(6_000);
    expect(result.nssfEmployer).toBe(6_000);
    expect(result.shifEmployee).toBe(2_750);
    expect(result.housingLevyEmployee).toBe(1_500);
    expect(result.housingLevyEmployer).toBe(1_500);
    expect(result.personalRelief).toBe(2_400);
    expect(result.paye).toBe(19_308.35);
    expect(result.netPay).toBe(70_441.65);
    expect(result.employerStatutoryCost).toBe(7_500);
  });

  it('enforces minimum SHIF and excludes personal relief for non-residents', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 10_000, residentForTaxPurposes: false });
    expect(result.shifEmployee).toBe(300);
    expect(result.personalRelief).toBe(0);
    expect(result.netPay).toBeGreaterThanOrEqual(0);
  });

  it('caps deductible pension, post-retirement medical and mortgage amounts', () => {
    const result = calculateKenyaMonthlyPayroll({
      grossCashPay: 200_000,
      employeePensionContribution: 50_000,
      postRetirementMedicalContribution: 20_000,
      qualifyingMortgageInterest: 40_000,
    });
    expect(result.pensionDeductionAllowed).toBe(30_000);
    expect(result.postRetirementMedicalContribution).toBe(20_000);
    expect(result.postRetirementMedicalDeduction).toBe(15_000);
    expect(result.employeeDeductions).toBeGreaterThanOrEqual(20_000);
    expect(result.mortgageInterestDeduction).toBe(30_000);
  });

  it('rejects negative and non-finite input amounts', () => {
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: -1 })).toThrow(RangeError);
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: Number.NaN })).toThrow(RangeError);
  });
});
