const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api-development.onrender.com/api").replace(/\/$/, "");
const endpoint = `${base}/health`;
let lastError;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(45000),
      headers: { accept: "application/json" },
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (response.ok && data?.status === "ok" && data?.database === "connected") {
      console.log(JSON.stringify({
        result: "PASS",
        endpoint,
        attempt,
        httpStatus: response.status,
        status: data.status,
        database: data.database,
        timestamp: data.timestamp ?? null,
      }, null, 2));
      process.exit(0);
    }
    lastError = new Error(`Attempt ${attempt}: HTTP ${response.status}; response=${JSON.stringify(data).slice(0, 500)}`);
  } catch (error) {
    lastError = new Error(`Attempt ${attempt}: ${String(error?.stack || error)}`);
  }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 5000));
}
console.error(JSON.stringify({ result: "FAIL", endpoint, error: String(lastError?.stack || lastError) }, null, 2));
process.exit(1);
