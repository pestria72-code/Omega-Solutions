/**
 * Authenticate an existing development test account. Prefer Neon Auth and
 * exchange its verified identity JWT; support legacy Omega login for older
 * already-registered accounts. Never registers or creates an account.
 */
export async function neonTestLogin(apiBase, options = {}) {
  const slot = options.slot ?? "A";
  const suffix = ["A", "B", "APPROVER"].includes(String(slot).toUpperCase()) ? String(slot).toUpperCase() : "B";
  const email = process.env[`OMEGA_SECURITY_TEST_${suffix}_EMAIL`];
  const password = process.env[`OMEGA_SECURITY_TEST_${suffix}_PASSWORD`];
  const configuredEmails = ["A", "B", "APPROVER"].map(key => process.env[`OMEGA_SECURITY_TEST_${key}_EMAIL`]?.trim().toLowerCase()).filter(Boolean);
  if (new Set(configuredEmails).size !== configuredEmails.length) {
    throw new Error("Test-account configuration error: security test A, B, and APPROVER must use distinct email addresses. Refusing to run any test that writes data.");
  }
  const authBase = (process.env.NEON_AUTH_BASE_URL || "https://ep-fragrant-bird-b4hie5sp.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth").replace(/\/$/, "");
  const origin = (process.env.OMEGA_SECURITY_TEST_ORIGIN || "https://omega-solutions-git-development-pestria72-2760.vercel.app").replace(/\/$/, "");
  if (!email || !password) throw new Error(`Missing existing verified test-account secrets OMEGA_SECURITY_TEST_${suffix}_EMAIL/PASSWORD.`);
  const response = await fetch(`${authBase}/sign-in/email`, { method: "POST", headers: { "content-type": "application/json", origin, referer: `${origin}/login` }, body: JSON.stringify({ email, password }) });
  if (response.ok) {
    const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
    const cookie = cookies.map(value => value.split(";", 1)[0]).filter(Boolean).join("; ");
    if (!cookie) throw new Error("Neon Auth sign-in succeeded but did not set a session cookie.");
    const tokenResponse = await fetch(`${authBase}/token`, { method: "GET", headers: { origin, referer: `${origin}/login`, cookie } });
    const tokenResult = await tokenResponse.json().catch(() => ({}));
    const identityToken = tokenResult?.token ?? tokenResult?.data?.token;
    if (!tokenResponse.ok || typeof identityToken !== "string" || identityToken.split(".").length !== 3) throw new Error(`Neon Auth JWT endpoint failed (HTTP ${tokenResponse.status}); expected a JWT token.`);
    const exchange = await fetch(`${apiBase.replace(/\/$/, "")}/auth/neon/exchange`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: identityToken, companyName: options.companyName }) });
    const result = await exchange.json().catch(() => ({}));
    if (!exchange.ok || !result.accessToken) throw new Error(`Omega Neon identity exchange failed (HTTP ${exchange.status}): ${JSON.stringify(result).slice(0, 250)}`);
    return { email, token: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }
  if (response.status !== 401) throw new Error(`Neon Auth sign-in failed (HTTP ${response.status}); verify the existing account configuration.`);
  const legacy = await fetch(`${apiBase.replace(/\/$/, "")}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const result = await legacy.json().catch(() => ({}));
  if (!legacy.ok || !result.accessToken) throw new Error(`Existing account sign-in failed through Neon Auth (HTTP 401) and Omega legacy login (HTTP ${legacy.status}). Check the existing test-account secrets; no account was created.`);
  return { email, token: result.accessToken, refreshToken: result.refreshToken, user: result.user };
}
