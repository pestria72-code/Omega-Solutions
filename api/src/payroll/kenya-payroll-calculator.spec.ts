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
    expect(calculateNssfYear4(250_000)).toBe(6_480); // statutory Year 4 cap remains fixed regardless of custom-mode settings
  });

  it('calculates statutory deductions and resident PAYE relief transparently', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 100_000, statutoryOptions: { housingLevyEnabled: true } });
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

  it('supports company-selected legacy flat NSSF and independently disabled housing levy', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 100_000, statutoryOptions: { nssfMethod: 'LEGACY_FLAT_200', nssfEmployeeFlat: 200, nssfEmployerFlat: 200, housingLevyEnabled: false } });
    expect(result.nssfEmployee).toBe(200);
    expect(result.nssfEmployer).toBe(200);
    expect(result.housingLevyEmployee).toBe(0);
    expect(result.housingLevyEmployer).toBe(0);
    expect(result.statutoryOptions.nssfMethod).toBe('LEGACY_FLAT_200');
  });

  it('supports independent custom employee and employer rates for housing levy and NSSF', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 50_000, statutoryOptions: { nssfMethod: 'CUSTOM', nssfEmployeeRate: .05, nssfEmployerRate: .04, nssfPensionablePayCap: 40_000, housingLevyEnabled: true, housingLevyEmployeeRate: .01, housingLevyEmployerRate: .02 } });
    expect(result.nssfEmployee).toBe(2_000);
    expect(result.nssfEmployer).toBe(1_600);
    expect(result.housingLevyEmployee).toBe(500);
    expect(result.housingLevyEmployer).toBe(1_000);
  });

  it('enforces minimum SHIF and excludes personal relief for non-residents', () => {
    const result = calculateKenyaMonthlyPayroll({ grossCashPay: 10_000, residentForTaxPurposes: false, statutoryOptions: { housingLevyEnabled: true } });
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
      statutoryOptions: { housingLevyEnabled: true },
    });
    expect(result.pensionDeductionAllowed).toBe(30_000);
    expect(result.postRetirementMedicalContribution).toBe(20_000);
    expect(result.postRetirementMedicalDeduction).toBe(15_000);
    expect(result.employeeDeductions).toBeGreaterThanOrEqual(20_000);
    expect(result.mortgageInterestDeduction).toBe(30_000);
  });

  it('requires an explicit housing levy choice instead of assuming the levy is enabled', () => {
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: 100_000 })).toThrow('housingLevyEnabled must be a boolean');
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: 100_000, statutoryOptions: { housingLevyEnabled: false } })).not.toThrow();
  });

  it('rejects negative and non-finite input amounts', () => {
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: -1 })).toThrow(RangeError);
    expect(() => calculateKenyaMonthlyPayroll({ grossCashPay: Number.NaN })).toThrow(RangeError);
  });
});
