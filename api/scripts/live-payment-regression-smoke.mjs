import crypto from "node:crypto";
const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const stamp = Date.now();
const checks = [];
async function request(method, path, body, token, expected = [200, 201]) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
function assert(ok, message) { if (!ok) throw new Error(message); checks.push(message); }
async function tenant(label) {
  const email = `pay-regression-${label}-${stamp}@example.com`;
  const password = `Test-${crypto.randomUUID()}-9!`;
  const registered = await request("POST", "/auth/register", { email, password, fullName: "Payment Regression", phone: "+254700000000", companyName: `Payment Regression ${label} ${stamp}` }, null, [201]);
  assert(!!registered.userId && !!registered.companyId, `registered ${label} tenant`);
  const login = await request("POST", "/auth/login", { email, password });
  assert(!!login.accessToken, `authenticated ${label} tenant`);
  return { ...registered, token: login.accessToken };
}
async function main() {
  const health = await request("GET", "/health");
  assert(health.status === "ok" && health.database === "connected", "API and database healthy");
  const a = await tenant("owner");
  const b = await tenant("other");
  await request("GET", "/invoices", undefined, undefined, [401, 403]);
  assert(true, "invoice API requires authentication");
  const customer = await request("POST", "/customers", { name: `Payment Test Customer ${stamp}`, email: `customer-${stamp}@example.com` }, a.token, [201]);
  assert(!!customer.id, "created test customer");
  const product = await request("POST", "/products", { sku: `PAY-SVC-${stamp}`, name: "Payment Regression Service", sellingPrice: 1000, costPrice: 0, stockQuantity: 0, reorderLevel: 0, isService: true, isActive: true }, a.token, [201]);
  assert(!!product.id, "created service product");
  const invoice = await request("POST", "/invoices", { customerId: customer.id, issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), items: [{ productId: product.id, quantity: 1, unitPrice: 1000, taxRate: 0 }], notes: "Temporary payment regression" }, a.token, [201]);
  assert(!!invoice.id && Number(invoice.total) === 1000, "invoice total is correct");
  const sent = await request("PATCH", `/invoices/${invoice.id}/status`, { status: "sent" }, a.token);
  assert(sent.status === "sent", "invoice can be issued from draft");
  const invoiceJournalsResponse = await request("GET", "/accounting/journals", undefined, a.token);
  const invoiceJournals = Array.isArray(invoiceJournalsResponse) ? invoiceJournalsResponse : (invoiceJournalsResponse.items || invoiceJournalsResponse.data || []);
  const invoiceJournal = invoiceJournals.find(j => j.source_type === "invoice" && j.source_id === invoice.id);
  assert(!!invoiceJournal, "sales invoice journal is posted");
  assert(Math.abs(Number(invoiceJournal.total_debits) - 1000) < 0.005 && Math.abs(Number(invoiceJournal.total_credits) - 1000) < 0.005, "sales invoice journal is balanced");
  const rejectRef = `REJECT-${stamp}`;
  const rejectedReport = await request("POST", `/invoices/${invoice.id}/payments`, { amount: 125, method: "bank", reference: rejectRef }, a.token, [201]);
  const rejectId = rejectedReport.payments?.find(p => p.reference === rejectRef)?.id;
  assert(!!rejectId, "created pending payment report");
  const rejected = await request("POST", `/invoices/${invoice.id}/payments/${rejectId}/reject`, undefined, a.token);
  assert(rejected.payments.some(p => p.id === rejectId && p.status === "rejected") && Number(rejected.amount_paid) === 0, "rejection does not alter receivable");
  const confirmRef = `CONFIRM-${stamp}`;
  const pending = await request("POST", `/invoices/${invoice.id}/payments`, { amount: 400, method: "mpesa", reference: confirmRef }, a.token, [201]);
  const paymentId = pending.payments?.find(p => p.reference === confirmRef)?.id;
  assert(!!paymentId, "created confirmable payment report");
  const confirmed = await request("POST", `/invoices/${invoice.id}/payments/${paymentId}/confirm`, undefined, a.token);
  assert(Number(confirmed.amount_paid) === 400 && confirmed.status === "partially_paid", "confirmation updates invoice balance");
  assert(confirmed.payments.some(p => p.id === paymentId && p.status === "confirmed" && !!p.verified_at), "confirmation metadata persisted");
  const journalsResponse = await request("GET", "/accounting/journals", undefined, a.token);
  const journals = Array.isArray(journalsResponse) ? journalsResponse : (journalsResponse.items || journalsResponse.data || []);
  const journal = journals.find(j => j.source_type === "invoice_payment" && j.source_id === paymentId);
  assert(!!journal, "payment journal exists");
  assert(Math.abs(Number(journal.total_debits) - 400) < 0.005 && Math.abs(Number(journal.total_credits) - 400) < 0.005, "payment journal is balanced");
  const detail = await request("GET", `/accounting/journals/${journal.id}`, undefined, a.token);
  assert((detail.lines || []).some(l => Number(l.debit) === 400) && (detail.lines || []).some(l => Number(l.credit) === 400), "journal lines balance");
  const reconciled = await request("POST", `/invoices/${invoice.id}/payments/${paymentId}/reconcile`, { statementReference: `STMT-${stamp}` }, a.token);
  assert(reconciled.payments.some(p => p.id === paymentId && p.status === "reconciled" && p.reconciliation_reference === `STMT-${stamp}`), "reconciliation stored");
  const receivables = await request("GET", "/accounting/reconciliation/receivables", undefined, a.token);
  assert(receivables.reconciled === true && Math.abs(Number(receivables.customerInvoicesBalance) - 600) < 0.005, "receivables control account reconciles to outstanding invoices");
  const trialBalance = await request("GET", "/accounting/reports/trial-balance", undefined, a.token);
  assert(trialBalance.balanced === true && Math.abs(Number(trialBalance.variance)) <= 0.01, "trial balance is balanced");
  await request("GET", `/invoices/${invoice.id}`, undefined, b.token, [404]);
  await request("POST", `/invoices/${invoice.id}/payments/${paymentId}/confirm`, undefined, b.token, [403, 404]);
  assert(true, "cross-tenant invoice/payment access blocked");
  console.log(JSON.stringify({ result: "PASS", checksPassed: checks.length, checks }, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ result: "FAIL", checksPassed: checks.length, checks, error: String(error?.stack || error) }, null, 2)); process.exitCode = 1; });
