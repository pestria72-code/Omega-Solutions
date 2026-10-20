const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

type NeonResponse = {
  message?: string;
  error?: string;
  token?: string;
  data?: { token?: string };
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
    result = raw ? JSON.parse(raw) as NeonResponse : {};
  } catch {
    throw new Error("The email authentication service returned an invalid response. Please try again.");
  }

  if (!response.ok || result.error) {
    throw new Error(result.message || result.error || "Email authentication failed. Check your details and try again.");
  }
  return result;
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
  const tokenResponse = await neonRequest("/token");
  const token = tokenResponse.token || tokenResponse.data?.token;
  if (!token) {
    throw new Error("Email verified, but a secure sign-in token was not returned. Please sign in again.");
  }
  return token;
}

export async function signInWithNeon(emailInput: string, password: string): Promise<string> {
  const email = emailInput.trim().toLowerCase();
  await neonRequest("/sign-in/email", { email, password });
  const tokenResponse = await neonRequest("/token");
  const token = tokenResponse.token || tokenResponse.data?.token;
  if (!token) {
    throw new Error("Email sign-in succeeded, but the secure sign-in token was not returned.");
  }
  return token;
}

export async function getNeonIdentityToken(): Promise<string> {
  const tokenResponse = await neonRequest("/token");
  const token = tokenResponse.token || tokenResponse.data?.token;
  if (!token) throw new Error("Neon sign-in completed, but no identity token was returned. Please sign in to Neon in this browser, then retry the invitation.");
  return token;
}
