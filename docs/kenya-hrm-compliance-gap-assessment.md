# Kenya HRM and Payroll Compliance Gap Assessment

**Assessment date:** 15 October 2026  
**Repository scope:** `development` branch only  
**Purpose:** Engineering gap assessment against Kenyan employment, payroll, and data-protection requirements. This is not a legal opinion; have Kenyan employment counsel/payroll specialists sign off before production payroll.

## Executive conclusion

Omega Solutions has a useful Kenya-oriented HR/payroll foundation, but it is **not yet safe to market as fully Kenya-compliant or use as the sole production payroll/compliance system without further work and professional sign-off**.

### What exists today

- Employee records with National ID, KRA PIN, NSSF, SHA/SHIF and legacy NHIF identifiers. API responses return presence flags rather than these identifiers; create/update paths mask identifiers in audit data.
- Tenant-scoped employee CRUD and leave-request/review endpoints with permissions and audit logging.
- Client sites, employee assignments, transfer records and per-assignment monthly/daily/hourly/per-shift pay rates.
- Clock-in/out events with timestamp/order checks, monthly attendance checklist import/preview, duplicate-ID detection, site/assignment matching, approval status, and present/absent/leave/unresolved/rest-day totals.
- A Kenya payroll calculator for PAYE, NSSF Year 4, SHIF, employee/employer Affordable Housing Levy, personal relief, insurance relief, pension, post-retirement medical contributions and qualifying mortgage interest.
- Draft payroll runs, approval/posting routes and payroll journal balancing logic.
- Regression smoke scripts for statutory identifier privacy and a sample draft payroll calculation.

## Findings against Kenya requirements

| Area | Current implementation | Assessment / gap |
|---|---|---|
| Employee particulars and contracts | Employee number, names, contact, job title, department, branch and hire date. | **Gap.** No complete employment-contract/particulars workflow for contract type/term, workplace, normal hours, pay interval, notice terms, housing/house allowance, pension terms and signed-document history. Employment Act sections 9–10 require written employment particulars for applicable contracts. |
| Employee statutory identifiers | National ID, KRA PIN, NSSF, SHA/SHIF and legacy NHIF fields; privacy-oriented responses and audit masking. | **Good foundation.** Add field-level protection, restricted reveal, access logs, retention/deletion policy, and correction/export workflows. Legacy NHIF should be clearly marked historical, not a current deduction. |
| Leave | Request/review workflow for annual, sick, maternity, paternity, compassionate, unpaid and other leave. Prevents overlapping pending/approved requests. | **Material gap.** No demonstrated accrual/balance engine, statutory eligibility/limits, entitlement snapshots, leave ledger, holiday calendar, carry-forward/expiry rules, sick-note tracking, or termination leave payout. Pre-adoptive leave is not represented. |
| Attendance | Clock-in/out, manual monthly attendance import, source attribution, site/assignment association and approval. | **Useful, not complete.** No demonstrated roster/contract-hours engine, public-holiday calendar, overtime/rest-day calculations, exception workflow, timesheet-to-payroll approval integration, or complete timesheet/payslip evidence trail. Manual monthly counts are operationally useful but must not be mistaken for statutory leave or wage calculations. |
| Minimum wages | Assignment rates can be stored for monthly, daily, hourly or per-shift work. | **High-priority gap.** No evidence of enforcement against current wage orders by occupation, location, wage basis and effective date. The 2026 General and Agricultural Wage Orders are reported as effective 1 May 2026; confirm the gazetted tables and occupation/location mappings before implementing. Nakuru has its own geographic category in the General Wage Order. |
| PAYE | Progressive bands, resident personal relief, insurance relief and selected allowable deductions are implemented. | **Partial.** Add tax-table/rule effective dates by payroll period, exemption-certificate support, documented validation for unusual taxable benefits and all KRA-supported cases, and official P10/P9-compatible exports. Current KRA guidance says employers must apply relevant deductions, reliefs and exemptions when supported. |
| NSSF | Year 4 6% tier calculation with KES 9,000 lower and KES 108,000 upper limits; employee and employer shares. | **Current-rate baseline appears aligned for periods from February 2026.** Missing effective-dated historical rules for earlier payroll periods and employer remittance/reporting outputs. |
| SHIF/SHA | 2.75% of gross taxable employment income with KES 300 minimum. | **Needs specialist verification.** Confirm the salary-earner base and minimum handling against the applicable SHA regulations and employer guidance; separate contribution base from PAYE taxable income if definitions differ. Add monthly SHA remittance reports and reconciliation. |
| Affordable Housing Levy | 1.5% employee and 1.5% employer, calculated on gross cash pay. | **Current percentage baseline appears aligned.** Verify the exact gross-salary base for every pay component and effective-date handling; provide remittance reports and reconciliation. |
| Payroll approvals and accounting | Draft, approve and post states; journal lines are balanced before posting. | **Good control foundation.** Keep preparation, approval and posting permissions separated; add payment/bank-file workflow, payslip generation, payment confirmation, reversals, statutory liability ageing and end-to-end accounting reconciliation tests. |
| Payroll reports and statutory files | Payroll-run detail exposes calculation fields. | **Gap.** No verified KRA P10 import-ready export, employee P9/P9A tax deduction card, NSSF contribution schedule, SHA contribution schedule, Housing Levy schedule, or submission/reconciliation evidence was established in this code review. |
| Privacy and tenant isolation | Company-scoped employee/payroll queries, permissions, audit logging and masked statutory identifier responses. | **Positive foundation, more controls required.** Perform a documented data-protection impact/risk assessment, controller/processor role analysis, retention policy, employee privacy notice, data-subject access/correction process, incident/breach workflow, and cross-tenant tests for every HR/payroll route and export. |

## Statutory rules to model as effective-dated configuration

1. **PAYE:** KRA currently publishes monthly bands of 10%, 25%, 30%, 32.5% and 35%, with KES 2,400 monthly personal relief for resident individuals. Taxable employment income can include taxable cash and non-cash benefits. Housing Levy, SHIF, qualifying pension, post-retirement medical contributions and qualifying mortgage interest affect the PAYE base under current KRA guidance.
2. **NSSF:** The official Year 4 notice effective February 2026 specifies a 6% employee contribution and matching employer contribution, a KES 9,000 lower earnings limit, a KES 108,000 upper earnings limit, and a maximum KES 6,480 from each side per month.
3. **SHIF:** Current official/government material describes a 2.75% contribution on gross salary/income and employer remittance. Confirm the exact salary-earner rule and any minimum with SHA guidance before signing off.
4. **Affordable Housing Levy:** KRA describes 1.5% employee and 1.5% employer contributions, with remittance within nine working days after month-end.
5. **Wage floors:** Minimum wage is not one universal number. It varies by occupation, location and pay basis, and must be checked against the applicable current General or sector wage order. The 2026 wage orders require particular attention for payroll periods from 1 May 2026.
6. **Leave and records:** Employment Act minimums include at least 21 working days' annual leave per 12 months; maternity leave of three months with full pay; paternity leave of two weeks with full pay; and, after the statutory qualifying period, at least seven days' sick leave with full pay plus seven days at half pay in each 12-month period, subject to the Act's conditions. Employers must maintain specified employment and leave records.

## Recommended implementation order

### P0 — Before production payroll
- Add effective-dated statutory rule tables and select rules using the payroll period, not today's rates.
- Add a reviewed test matrix for KRA PAYE, NSSF Year 4, SHIF, Housing Levy, deductions/reliefs, taxable benefits, non-residents and exemption certificates.
- Validate SHIF calculation basis and current minimum treatment with SHA guidance.
- Implement minimum-wage validation by occupation, location, pay basis and effective date, with an override requiring a reason and audit trail.
- Generate payslips and official-format payroll outputs: KRA P10/P9, NSSF, SHA and Housing Levy schedules.
- Test payroll approval, posting, payment and remittance reconciliation with balanced journals and tenant isolation.

### P1 — Employment-law workflow
- Complete employee contract particulars and document lifecycle.
- Implement leave entitlements, accruals, balances, approvals, carry-forward and exit settlement.
- Add public-holiday calendars, rosters, contracted hours, overtime/rest-day rules by applicable sector/wage order, and approved attendance-to-payroll integration.
- Add termination, notice, final dues, service/gratuity handling where applicable, and statutory employment-record exports.

### P2 — Governance and operational maturity
- Field-level protection/restricted reveal for National ID, KRA PIN and membership numbers.
- Data-retention, correction, export and deletion processes; audit access to sensitive fields.
- Privacy notice, processor/controller agreements, DPIA/risk assessment, backup/restore drills, incident response and cross-tenant HR/payroll authorization tests.
- A scheduled review process whenever KRA, NSSF, SHA, Housing Levy or wage orders change.

## Source register

- Kenya Employment Act, 2007 — State Department for Labour: https://www.labour.go.ke/sites/default/files/law/The_Employment_Act_2007.pdf
- Employment Act section 10 (employment particulars): https://kenyalawyers.co.ke/global/law/employment-act/section-10/
- Employment Act section 74 (employer records): https://kenyalawyers.co.ke/global/law/employment-act/section-74/
- KRA PAYE guidance and due dates: https://www.kra.go.ke/individual/filing-paying/types-of-taxes/paye
- KRA guidance on applying deductions, reliefs and exemptions (6 October 2025): https://www.zd.kra.go.ke/news-center/public-notices/2307-guidance-on-employer-obligations-in-applying-income-tax-deductions%2C-reliefs-and-exemptions
- KRA PAYE computation amendments and P10 reference: https://www.kra.go.ke/news-center/public-notices/2157-amendments-to-paye-computation-pursuant-to-the-tax-laws-amendment-act-2024
- NSSF Year 4 2026 notice: https://www.nssf.or.ke/notice-to-employers-year-4-2026-nssf-contribution-rates
- Kenya Wage Order 2024 (historical baseline only; do not use instead of the 2026 order): https://labour.go.ke/sites/default/files/2025-01/Regulation%20of%20Wages%20%28General%29%20%28Amendment%29%20Order%202024%20full.pdf
- 2026 minimum wage overview (secondary source; verify against the gazetted 2026 legal notices): https://www.grantthornton.co.ke/insights/kenya-minimum-wage-guide-2026/
- ODPC data-subject rights: https://www.odpc.go.ke/rights-of-a-data-subject/
- ODPC controller/processor and registration guidance: https://www.odpc.go.ke/faqs/

**Important:** This document is an engineering gap assessment, not legal advice or a compliance certificate. Statutory calculations and employment policies should be signed off by a qualified Kenyan payroll practitioner and employment-law adviser before live payroll is processed.
