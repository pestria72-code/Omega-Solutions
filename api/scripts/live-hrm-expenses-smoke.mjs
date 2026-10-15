const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const stamp = Date.now();
const email = `omega-hrm-e2e-${stamp}@example.com`;
const password = `E2e-${crypto.randomUUID()}-9!`;
const companyName = `Omega HRM E2E ${stamp}`;
const checks = [];
async function req(method, path, body, token, expected = [200, 201]) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!expected.includes(response.status)) throw Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 350)}`);
  return { status: response.status, data };
}
function ok(value, message) { if (!value) throw Error(message); checks.push(message); }
try {
  let health;
  let lastError;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      health = await req("GET", "/health");
      if (health.data?.status === "ok" && health.data?.database === "connected") break;
      health = null;
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!health) throw Error(`API health/database did not recover: ${String(lastError || "unexpected health response")}`);
  ok(health.data.status === "ok" && health.data.database === "connected", "health and database connection");
  const registration = (await req("POST", "/auth/register", {
    email, password, fullName: "Omega HRM E2E Runner", phone: "+254700000000", companyName,
  }, null, [201])).data;
  ok(!!registration.userId && !!registration.companyId, "register isolated temporary tenant");
  const login = (await req("POST", "/auth/login", { email, password })).data;
  const token = login.accessToken;
  ok(!!token && !!login.refreshToken, "login and token pair");
  const identity = (await req("GET", "/auth/me", undefined, token)).data;
  ok(identity.userId === registration.userId && identity.companyId === registration.companyId, "authenticated tenant identity");

  const employee = (await req("POST", "/employees", {
    employeeNumber: `E2E-${stamp}`, firstName: "Test", lastName: "Employee",
    workEmail: `employee-${stamp}@example.com`, jobTitle: "QA Test", department: "Validation",
    hireDate: new Date().toISOString().slice(0, 10),
  }, token, [201])).data;
  ok(!!employee.id && employee.company_id === registration.companyId, "create company-scoped employee");
  const employeeList = (await req("GET", "/employees", undefined, token)).data;
  ok(Array.isArray(employeeList) && employeeList.some(row => row.id === employee.id), "employee appears in company list");

  const startDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const leave = (await req("POST", "/employees/leave-requests", {
    employeeId: employee.id, leaveType: "annual", startDate, endDate, reason: "Automated approval workflow validation",
  }, token, [201])).data;
  ok(!!leave.id && leave.status === "pending", "create pending leave request");
  const approved = (await req("PATCH", `/employees/leave-requests/${leave.id}/review`, {
    status: "approved", reviewNote: "Automated test approval",
  }, token, [200])).data;
  ok(approved.status === "approved", "approve leave request");
  await req("POST", "/employees/leave-requests", {
    employeeId: employee.id, leaveType: "annual", startDate, endDate, reason: "Must conflict with approved leave",
  }, token, [409]);
  ok(true, "overlapping leave request rejected");

  const expense = (await req("POST", "/expenses", {
    description: `E2E expense ${stamp}`, category: "testing", amount: 123.45,
    paymentMethod: "mpesa", expenseDate: new Date().toISOString().slice(0, 10),
    reference: `E2E-EXP-${stamp}`,
  }, token, [201])).data;
  ok(!!expense.id && Number(expense.amount) === 123.45 && !!expense.journal_entry_id, "create expense and link journal entry");
  const expenses = (await req("GET", "/expenses", undefined, token)).data;
  ok(Array.isArray(expenses) && expenses.some(row => row.id === expense.id), "expense appears in company expense list");
  const journals = (await req("GET", "/accounting/journals", undefined, token)).data;
  const journal = journals.find(row => row.id === expense.journal_entry_id && row.source_type === "expense");
  ok(!!journal && Number(journal.total_debits) === 123.45 && Number(journal.total_credits) === 123.45, "expense posts a balanced journal entry");

  const trialBalance = (await req("GET", "/accounting/reports/trial-balance", undefined, token)).data;
  ok(trialBalance.balanced === true && Math.abs(Number(trialBalance.variance)) <= 0.01, "trial balance debit/credit totals reconcile");
  ok(Math.abs(Number(trialBalance.totalDebits) - Number(trialBalance.totalCredits)) <= 0.01, "trial balance total debits equal total credits");
  console.log(JSON.stringify({
    ok: true, email, companyId: registration.companyId, employeeId: employee.id,
    leaveRequestId: leave.id, expenseId: expense.id, journalEntryId: expense.journal_entry_id,
    trialBalance: { totalDebits: trialBalance.totalDebits, totalCredits: trialBalance.totalCredits, variance: trialBalance.variance },
    checks,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, email, error: String(error), checks }, null, 2));
  process.exitCode = 1;
}
