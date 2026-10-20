const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

type NeonResponse = {
  message?: string;
  error?: string;
  token?: string;
  data?: {
    token?: string;
    jwt?: string;
    accessToken?: string;
    access_token?: string;
    session?: { token?: string; access_token?: string; accessToken?: string };
  };
  /** JWT exposed by Neon Auth on the response, as consumed by the official SDK. */
  jwt?: string;
  accessToken?: string;
  access_token?: string;
  session?: { token?: string; access_token?: string; accessToken?: string };
};

function authUrl(): string {
  if (!NEON_AUTH_URL) {
    throw new Error("Email verification is not configured for this deployment. Please use the existing Omega sign-in or contact support.");
  }
  return NEON_AUTH_URL.replace(/\/$/, "");
}

async function neonRequest(path: string, body?: unknown): Promise<NeonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(`${authUrl()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    signal: controller.signal,
    headers: body === undefined ? { Accept: "application/json" } : {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Neon sign-in is taking too long. Your invitation has not been accepted yet. Retry secure sign-in, or sign in to Neon in this browser and reopen the invitation.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let result: NeonResponse = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    // Some auth endpoints (notably an unauthenticated /get-session) can return JSON null.
    // Normalize that response before reading error/message fields so the invitation page
    // can show the intended sign-in guidance instead of crashing on null.error.
    result = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as NeonResponse
      : {};
  } catch {
    throw new Error("The email authentication service returned an invalid response. Please try again.");
  }

  if (!response.ok || result.error) {
    throw new Error(result.message || result.error || "Email authentication failed. Check your details and try again.");
  }
  return { ...result, jwt: response.headers.get("set-auth-jwt") || undefined };
}

export async function registerWithNeon(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<void> {
  await neonRequest("/sign-up/email", {
    name: input.fullName,
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  await neonRequest("/email-otp/send-verification-otp", {
    email: input.email.trim().toLowerCase(),
    type: "email-verification",
  });
}

export async function resendNeonVerification(email: string): Promise<void> {
  await neonRequest("/email-otp/send-verification-otp", {
    email: email.trim().toLowerCase(),
    type: "email-verification",
  });
}

export async function verifyNeonEmailAndSignIn(input: {
  email: string;
  password: string;
  otp: string;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  await neonRequest("/email-otp/verify-email", { email, otp: input.otp.trim() });

  // Verification deliberately does not sign the user in; perform an explicit password sign-in.
  await neonRequest("/sign-in/email", { email, password: input.password });
  const tokenResponse = await neonRequest("/get-session");
  const token = tokenResponse.jwt || tokenResponse.data?.session?.token || tokenResponse.token || tokenResponse.data?.token;
  if (!token) {
    throw new Error("Email verified, but a secure sign-in token was not returned. Please sign in again.");
  }
  return token;
}

export async function signInWithNeon(emailInput: string, password: string): Promise<string> {
  const email = emailInput.trim().toLowerCase();
  await neonRequest("/sign-in/email", { email, password });
  const tokenResponse = await neonRequest("/get-session");
  const token = tokenResponse.jwt || tokenResponse.data?.session?.token || tokenResponse.token || tokenResponse.data?.token;
  if (!token) {
    throw new Error("Email sign-in succeeded, but the secure sign-in token was not returned.");
  }
  return token;
}

export async function getNeonIdentityToken(): Promise<string> {
  // Confirm the magic-link callback actually established a browser session before
  // asking the JWT plugin for a token. This distinguishes a missing session cookie
  // from a token response that the client cannot parse.
  const sessionResponse = await neonRequest("/get-session");
  const session = sessionResponse.data?.session || sessionResponse.session;
  const hasSession = Boolean(session || sessionResponse.data?.token || sessionResponse.token);
  if (!hasSession) {
    throw new Error("Neon did not find a signed-in browser session. Open the newest invitation email link in this same browser, complete the Neon sign-in, and retry acceptance.");
  }

  // Do not use session.token as an identity JWT: it may be an opaque session ID.
  const tokenResponse = await neonRequest("/token");
  const token = tokenResponse.jwt
    || tokenResponse.accessToken
    || tokenResponse.access_token
    || tokenResponse.data?.jwt
    || tokenResponse.data?.token
    || tokenResponse.data?.accessToken
    || tokenResponse.data?.access_token
    || tokenResponse.data?.session?.access_token
    || tokenResponse.data?.session?.accessToken
    || tokenResponse.token;
  if (!token) {
    throw new Error("Neon session exists, but its token endpoint did not return an identity JWT. The invitation is still pending; retry after the Neon Auth session is established.");
  }
  return token;
}
