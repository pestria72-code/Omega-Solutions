const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const emailA = process.env.OMEGA_SECURITY_TEST_A_EMAIL;
const passwordA = process.env.OMEGA_SECURITY_TEST_A_PASSWORD;
const emailB = process.env.OMEGA_SECURITY_TEST_B_EMAIL;
const passwordB = process.env.OMEGA_SECURITY_TEST_B_PASSWORD;
if (![emailA, passwordA, emailB, passwordB].every(v => typeof v === "string" && v.trim())) {
  throw new Error("Configure OMEGA_SECURITY_TEST_A_EMAIL, OMEGA_SECURITY_TEST_A_PASSWORD, OMEGA_SECURITY_TEST_B_EMAIL, and OMEGA_SECURITY_TEST_B_PASSWORD as GitHub Actions secrets. Never pass credentials on the command line.");
}
if (emailA.toLowerCase() === emailB.toLowerCase()) throw new Error("Security test requires two distinct verified development accounts.");
const checks = [];
function assert(ok, message) {
  if (!ok) throw new Error(message);
  checks.push(message);
}
async function request(method, path, body, token, expected = [200]) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path}: expected HTTP ${expected.join("/")}, received ${response.status}; response=${JSON.stringify(data).slice(0, 250)}`);
  }
  return data;
}
async function login(email, password, label) {
  const result = await request("POST", "/auth/login", { email, password }, undefined, [200]);
  assert(typeof result.accessToken === "string" && typeof result.refreshToken === "string", `${label}: login returns access and refresh tokens`);
  assert(typeof result.user?.companyId === "string" && result.user.companyId.length > 0, `${label}: login selects an active company`);
  return { accessToken: result.accessToken, refreshToken: result.refreshToken, companyId: result.user.companyId };
}
async function main() {
  const health = await request("GET", "/health", undefined, undefined, [200]);
  assert(health?.status === "ok" && health?.database === "connected", "development API and database are healthy");

  const a = await login(emailA, passwordA, "Account A");
  const b = await login(emailB, passwordB, "Account B");
  assert(a.companyId !== b.companyId, "accounts belong to different companies; test is not accidentally same-tenant");

  const meA = await request("GET", "/auth/me", undefined, a.accessToken);
  const meB = await request("GET", "/auth/me", undefined, b.accessToken);
  assert(meA.companyId === a.companyId, "Account A /auth/me matches its selected company");
  assert(meB.companyId === b.companyId, "Account B /auth/me matches its selected company");

  // A client-supplied query parameter must not override the company in the signed token.
  const forgedContext = await request("GET", `/auth/me?companyId=${encodeURIComponent(b.companyId)}`, undefined, a.accessToken);
  assert(forgedContext.companyId === a.companyId, "client-supplied companyId cannot override Account A's token context");

  // Prove row-level tenant isolation with one unique temporary record, and always try to clean it up.
  let temporaryCustomerId;
  try {
    const marker = `OMEGA-TENANT-SECURITY-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const created = await request("POST", "/customers", { name: marker, email: `${marker.toLowerCase()}@example.com` }, a.accessToken, [201]);
    temporaryCustomerId = created.id;
    assert(typeof temporaryCustomerId === "string", "Account A created a unique temporary customer");

    const aCustomersResponse = await request("GET", "/customers", undefined, a.accessToken);
    const aCustomers = Array.isArray(aCustomersResponse) ? aCustomersResponse : (aCustomersResponse.items || aCustomersResponse.data || []);
    assert(aCustomers.some(c => c.id === temporaryCustomerId), "Account A can see its own temporary customer");

    await request("GET", `/customers/${temporaryCustomerId}`, undefined, b.accessToken, [403, 404]);
    const bCustomersResponse = await request("GET", "/customers", undefined, b.accessToken);
    const bCustomers = Array.isArray(bCustomersResponse) ? bCustomersResponse : (bCustomersResponse.items || bCustomersResponse.data || []);
    assert(!bCustomers.some(c => c.id === temporaryCustomerId), "Account B cannot read or list Account A's customer");

    // A user must not switch into a company where they have no active membership.
    await request("POST", "/auth/switch-company", { companyId: b.companyId }, a.accessToken, [400, 401, 403, 404]);
    assert(true, "Account A cannot switch into Account B's company");
    await request("POST", "/auth/switch-company", { companyId: a.companyId }, b.accessToken, [400, 401, 403, 404]);
    assert(true, "Account B cannot switch into Account A's company");

    const refreshed = await request("POST", "/auth/refresh", { refreshToken: a.refreshToken }, undefined, [200]);
    assert(typeof refreshed.accessToken === "string" && typeof refreshed.refreshToken === "string", "refresh issues a new token pair");
    const meAfterRefresh = await request("GET", "/auth/me", undefined, refreshed.accessToken);
    assert(meAfterRefresh.companyId === a.companyId, "refresh preserves Account A's selected company");

    await request("GET", "/auth/me", undefined, undefined, [401, 403]);
    assert(true, "protected profile endpoint rejects unauthenticated requests");
  } finally {
    if (temporaryCustomerId) {
      await request("DELETE", `/customers/${temporaryCustomerId}`, undefined, a.accessToken, [200, 204]);
      checks.push("temporary customer cleanup requested");
    }
  }

  console.log(JSON.stringify({ result: "PASS", api: base, checks }, null, 2));
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
