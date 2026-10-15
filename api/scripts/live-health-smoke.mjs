const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(20000), headers: { accept: "application/json" } });
const raw = await response.text();
let data;
try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
if (!response.ok) throw new Error(`GET /health returned HTTP ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);
if (data?.status !== "ok" || data?.database !== "connected") {
  throw new Error(`Health response did not confirm API and database health: ${JSON.stringify(data).slice(0, 500)}`);
}
console.log(JSON.stringify({ result: "PASS", endpoint: `${base}/health`, httpStatus: response.status, status: data.status, database: data.database, timestamp: data.timestamp ?? null }, null, 2));
