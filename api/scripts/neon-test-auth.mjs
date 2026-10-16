/**
 * Sign in to an existing, verified Neon Auth identity and exchange its JWT
 * for Omega API tokens. This helper never registers or creates accounts.
 */
export async function neonTestLogin(apiBase, options = {}) {
  const slot = options.slot ?? "A";
  const companyName = options.companyName ?? "Omega E2E Test";
  const suffix = slot === "A" ? "" : `_${slot}`;
  const email = process.env[`OMEGA_NEON_TEST_EMAIL${suffix}`];
  const password = process.env[`OMEGA_NEON_TEST_PASSWORD${suffix}`];
  const authBase = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!email || !password || !authBase) throw new Error(`Missing verified Neon Auth configuration: NEON_AUTH_BASE_URL and OMEGA_NEON_TEST_EMAIL${suffix}/OMEGA_NEON_TEST_PASSWORD${suffix} are required.`);
  const signIn = await fetch(`${authBase}/sign-in/email`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!signIn.ok) throw new Error(`Neon Auth sign-in failed (HTTP ${signIn.status}); check the configured test account and email verification.`);
  const cookie = (signIn.headers.getSetCookie?.() ?? [signIn.headers.get("set-cookie") ?? ""]).map(value => value.split(";")[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("Neon Auth sign-in returned no session cookie; check the configured auth endpoint.");
  const tokenResponse = await fetch(`${authBase}/token`, { headers: { cookie } });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  const identityToken = tokenBody?.token;
  if (!tokenResponse.ok || typeof identityToken !== "string" || identityToken.length < 20) throw new Error(`Neon Auth JWT retrieval failed (HTTP ${tokenResponse.status}); check the Neon Auth token endpoint.`);
  const exchanged = await fetch(`${apiBase.replace(/\/$/, "")}/auth/neon/exchange`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: identityToken, fullName: "Omega Automated Test", companyName }) });
  const payload = await exchanged.json().catch(() => ({}));
  if (!exchanged.ok || !payload.accessToken) throw new Error(`Omega Neon identity exchange failed (HTTP ${exchanged.status}): ${JSON.stringify(payload).slice(0, 250)}`);
  return { email, token: payload.accessToken, refreshToken: payload.refreshToken, user: payload.user };
}
