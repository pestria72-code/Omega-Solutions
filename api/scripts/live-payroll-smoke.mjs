import { neonTestLogin } from "./neon-test-auth.mjs";
import { randomInt, randomUUID } from "node:crypto";
// Authenticated payroll smoke test for the Omega development API only.
// This creates a dedicated test tenant, employee, pay settings and an unapproved draft run.
// It never approves or posts payroll. The created records are intentionally retained for audit.

const expectedBase = "https://omega-solutions-api.onrender.com/api";
const configuredBase = process.env.OMEGA_API_URL?.replace(/\/$/, "");
if (process.env.OMEGA_PAYROLL_SMOKE_CONFIRM_DEVELOPMENT !== "YES") {
  throw new Error("Refusing to run: set OMEGA_PAYROLL_SMOKE_CONFIRM_DEVELOPMENT=YES only after confirming this is the development API.");
}
if (configuredBase !== expectedBase) {
  throw new Error(`Refusing to run against an unapproved API URL. Expected exactly ${expectedBase}.`);
}
const base = configuredBase;
const stamp = Date.now();
const testNationalId = String(randomInt(10000000, 99999999));
const testEmployeeNumber = `PAYE2E-${stamp}-${randomUUID().slice(0, 8)}`;
const checks = [];
let companyId;
let employeeId;
let payrollRunId;

async function req(method, path, body, token, expected = [200, 201]) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; }
  catch { data = raw; }
  if (!expected.includes(response.status)) {
    throw Error(`${method} ${path}: ${response.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

function ok(condition, message) {
  if (!condition) throw Error(message);
  checks.push(message);
}

try {
  const health = await req("GET", "/health");
  ok(health.status === "ok" && health.database === "connected", "development API and database healthy");

  const login = await neonTestLogin(base, { slot: "A", companyName: `Omega Payroll E2E ${stamp}` });
  const token = login.token;
  ok(!!token && !!login.refreshToken, "existing verified test account authenticated and exchanged");
  const identity = await req("GET", "/auth/me", undefined, token);
  companyId = identity.companyId;
  ok(typeof companyId === "string" && companyId.length > 0, "existing test account tenant identity verified");

  const emp = await req("POST", "/employees", {
    employeeNumber: testEmployeeNumber,
    firstName: "Test",
    lastName: "Payroll",
    nationalId: testNationalId,
    kraPin: "A123456789Z",
    nssfNumber: `NSSF${stamp}`,
    shaNumber: `SHA${stamp}`,
    nhifNumber: `NHIF${stamp}`,
    workEmail: `employee-${stamp}@example.com`,
    jobTitle: "QA Test",
    department: "Payroll Validation",
    hireDate: new Date().toISOString().slice(0, 10)
  }, token, [201]);
  employeeId = emp.id;
  ok(!!employeeId && emp.company_id === companyId, "company-scoped employee created");
  ok(emp.has_kra_pin === true && emp.has_nssf_number === true && emp.has_sha_number === true && emp.has_nhif_number === true,
    "statutory presence flags returned");

  const sensitive = [testNationalId, "A123456789Z", `NSSF${stamp}`, `SHA${stamp}`, `NHIF${stamp}`];
  ok(sensitive.every(value => !JSON.stringify(emp).includes(value)), "employee create response does not expose statutory identifiers");

  const directory = await req("GET", "/employees", undefined, token);
  const listed = Array.isArray(directory) ? directory.find(employee => employee.id === employeeId) : null;
  ok(!!listed && listed.has_kra_pin && listed.has_nssf_number && listed.has_sha_number && listed.has_nhif_number,
    "directory returns statutory presence flags");
  ok(sensitive.every(value => !JSON.stringify(listed).includes(value)), "employee directory does not expose statutory identifiers");

  const settings = await req("POST", `/payroll/employees/${employeeId}/settings`, {
    monthlyBasicSalary: 100000,
    monthlyTaxableAllowances: 0,
    monthlyTaxableBenefits: 0,
    employeePensionContribution: 0,
    postRetirementMedicalContribution: 0,
    qualifyingMortgageInterest: 0,
    eligibleInsurancePremiums: 0,
    residentForTaxPurposes: true,
    effectiveFrom: "2026-09-01"
  }, token, [200, 201]);
  ok(settings.employee_id === employeeId && Number(settings.monthly_basic_salary) === 100000,
    "KES 100,000 monthly salary settings saved");

  const run = await req("POST", "/payroll/runs", {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30"
  }, token, [200, 201]);
  payrollRunId = run.id;
  ok(!!payrollRunId && run.status === "draft" && Number(run.employee_count) === 1,
    "September 2026 payroll created as a one-employee draft");

  const details = await req("GET", `/payroll/runs/${payrollRunId}`, undefined, token);
  ok(details.status === "draft" && details.approved_at == null && details.posted_at == null && details.journal_entry_id == null,
    "payroll remains unapproved and unposted");
  ok(Array.isArray(details.items) && details.items.length === 1 && details.items[0].employee_id === employeeId,
    "payroll contains exactly the test employee");

  // Expected values independently recomputed from the calculator currently on development:
  // NSSF 6% of KES 100,000 = 6,000; SHIF 2.75% = 2,750; housing levy 1.5% = 1,500.
  // Taxable income = 100,000 - 6,000 - 2,750 - 1,500 = 89,750.
  // PAYE before relief = 21,708.35; less resident personal relief 2,400 = 19,308.35.
  // Net pay = 100,000 - 6,000 - 2,750 - 1,500 - 19,308.35 = 70,441.65.
  for (const [field, value] of [
    ["nssf_employee", 6000],
    ["shif_employee", 2750],
    ["housing_levy_employee", 1500],
    ["paye", 19308.35],
    ["net_pay", 70441.65]
  ]) {
    ok(Math.abs(Number(details.items[0][field]) - value) < 0.01, `${field} matches expected KES ${value}`);
  }

  console.log(JSON.stringify({ ok: true, target: base, companyId, employeeId, payrollRunId, status: details.status, checks,
    note: "No approval or posting was performed. The workflow cleanup job removes this isolated tenant when configured." }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, target: base, error: String(error), companyId, employeeId, payrollRunId, checks,
    note: "If cleanup is not configured or fails, inspect the isolated test tenant before retrying." }, null, 2));
  process.exitCode = 1;
}
