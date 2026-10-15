# Kenya payroll rules — implementation baseline

**Ruleset reviewed:** 15 October 2026. **Currency:** KES. **Scope:** monthly payroll calculation primitives; not a substitute for statutory filing or professional tax review.

## Rules currently encoded

- **PAYE:** progressive monthly bands from KRA: first KES 24,000 at 10%; next KES 8,333 at 25%; next KES 467,667 at 30%; next KES 300,000 at 32.5%; excess over KES 800,000 at 35%. Resident personal relief is KES 2,400 monthly. Insurance relief is 15% of eligible premiums, capped at KES 5,000 monthly.
- **NSSF:** Year 4 rates effective February 2026: 6% Tier I on pensionable pay up to KES 9,000, plus 6% Tier II on the next KES 99,000, with maximum employee contribution KES 6,480 monthly. The employer match is calculated separately at the same rate.
- **SHIF:** 2.75% of gross employment income, subject to the KES 300 monthly minimum.
- **Affordable Housing Levy:** 1.5% of gross cash salary for the employee and a separate 1.5% employer contribution. KRA's definition of gross monthly salary includes basic salary and regular cash allowances; non-cash and irregular payments are treated according to applicable guidance.
- **Taxable income deductions:** employee housing levy and SHIF contributions; qualifying registered pension/provident contributions up to KES 30,000 monthly; qualifying post-retirement medical fund contributions up to KES 15,000 monthly; and qualifying mortgage interest up to KES 30,000 monthly.

## Implementation controls required before production payroll

1. Statutory rates must be versioned by effective date and reviewed whenever KRA, NSSF, or SHA changes guidance.
2. Payroll inputs must explicitly classify cash allowances, irregular pay, taxable benefits, pension scheme type, insurance premiums, residency, and any applicable exemptions. The calculator must not infer these from job title or base salary.
3. Payroll runs must be tenant-scoped, immutable after approval, auditable, and idempotent. Only approved runs may post a balanced journal entry.
4. Payslips and statutory summaries must be generated from stored calculation snapshots, not recalculated using future rates.
5. Before real payroll is run, reconcile test cases with the KRA calculator / current tax guidance and obtain review by a Kenyan payroll professional.

## Official references

- KRA, More about PAYE: https://www.kra.go.ke/helping-tax-payers/faqs/more-about-paye
- KRA, Individual Income Tax: https://www.kra.go.ke/individual/filing-paying/types-of-taxes/individual-income-tax
- KRA, Affordable Housing Levy: https://www.zd.kra.go.ke/news-center/public-notices/1979-affordable-housing-levy-ahl
- NSSF, Year 4 (2026) contribution notice: https://www.nssf.or.ke/notice-to-employers-year-4-2026-nssf-contribution-rates

This baseline intentionally does not automatically submit returns, trigger payments, or post payroll journals.
