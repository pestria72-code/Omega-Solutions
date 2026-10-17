import { neonTestLogin } from "./neon-test-auth.mjs";

const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const stamp = Date.now();
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
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 350)}`);
  return { status: response.status, data };
}
function ok(value, message) {
  if (!value) throw new Error(message);
  checks.push(message);
}
const near = (a, b, tolerance = 0.01) => Math.abs(Number(a) - b) <= tolerance;
try {
  let health = null;
  let lastHealthError = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      health = (await req("GET", "/health")).data;
      if (health?.status === "ok" && health?.database === "connected") break;
      health = null;
    } catch (error) { lastHealthError = error; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!health) throw new Error(`API health/database did not recover: ${String(lastHealthError || "unexpected health response")}`);
  ok(health.status === "ok" && health.database === "connected", "live API health and database");

  const login = await neonTestLogin(base, { slot: "B" });
  const token = login.token;
  ok(!!token && !!login.refreshToken, "existing verified test account authenticated without registration");
  const me = (await req("GET", "/auth/me", undefined, token)).data;
  ok(me.userId === login.user.userId && me.companyId === login.user.companyId, "authenticated company context preserved");

  const baseline = (await req("GET", "/inventory/reconciliation", undefined, token)).data;
  const material = (await req("POST", "/products", {
    sku: `MFG-MAT-${stamp}`, name: `MFG Test Material ${stamp}`, sellingPrice: 150, costPrice: 0,
    stockQuantity: 0, reorderLevel: 0, isService: false, isActive: true,
  }, token, [201])).data;
  const finished = (await req("POST", "/products", {
    sku: `MFG-FG-${stamp}`, name: `MFG Test Finished ${stamp}`, sellingPrice: 500, costPrice: 0,
    stockQuantity: 0, reorderLevel: 0, isService: false, isActive: true,
  }, token, [201])).data;
  ok(!!material.id && !!finished.id && material.id !== finished.id, "create isolated material and finished-goods test products");

  const warehouse = (await req("POST", "/inventory/warehouses", {
    code: `MFG${String(stamp).slice(-8)}`, name: `MFG Test Warehouse ${stamp}`,
    location: "Automated manufacturing integration test", capacity: 0, isActive: true,
  }, token, [201])).data;
  ok(!!warehouse.id, "create dedicated test warehouse");

  await req("POST", "/inventory/receipts", {
    productId: material.id, warehouseId: warehouse.id, quantity: 10, unitCost: 100,
    reference: `MFG-RECEIPT-${stamp}`, notes: "Manufacturing integration smoke test",
  }, token, [201]);
  let stock = (await req("GET", `/inventory/stock?warehouseId=${warehouse.id}`, undefined, token)).data;
  const stockRows = Array.isArray(stock) ? stock : (stock.items || stock.data || []);
  const materialAfterReceipt = stockRows.find(row => row.product_id === material.id || row.productId === material.id);
  ok(!!materialAfterReceipt && near(materialAfterReceipt.quantity, 10) && near(materialAfterReceipt.average_unit_cost, 100),
    "material receipt creates 10 units at KES 100 weighted-average cost");

  const bom = (await req("POST", "/manufacturing/boms", {
    code: `MFG-${String(stamp).slice(-10)}`, name: `MFG Test BOM ${stamp}`,
    productId: finished.id, outputQuantity: 1,
    lines: [{ materialProductId: material.id, quantity: 2, wastePercent: 0 }],
    notes: "Temporary live manufacturing smoke test",
  }, token, [201])).data;
  ok(!!bom.id && bom.lines?.length === 1, "create BOM with two material units per finished unit");

  const order = (await req("POST", "/manufacturing/orders", {
    bomId: bom.id, warehouseId: warehouse.id, plannedQuantity: 2,
    plannedStartDate: new Date().toISOString().slice(0, 10),
    notes: "Temporary live manufacturing weighted-average cost test",
  }, token, [201])).data;
  ok(!!order.id && order.status === "planned", "create planned production order for two finished units");

  const started = (await req("POST", `/manufacturing/orders/${order.id}/start`, {}, token)).data;
  ok(started.status === "in_progress", "start production and reserve required components");
  stock = (await req("GET", `/inventory/stock?warehouseId=${warehouse.id}`, undefined, token)).data;
  const reservedRows = Array.isArray(stock) ? stock : (stock.items || stock.data || []);
  const materialReserved = reservedRows.find(row => row.product_id === material.id || row.productId === material.id);
  ok(!!materialReserved && near(materialReserved.quantity, 10) && near(materialReserved.reserved_quantity, 4),
    "production reserves four material units without reducing on-hand stock");

  const completed = (await req("POST", `/manufacturing/orders/${order.id}/complete`, {}, token)).data;
  ok(completed.status === "completed" && near(completed.produced_quantity, 2), "complete production and record two finished units");

  stock = (await req("GET", `/inventory/stock?warehouseId=${warehouse.id}`, undefined, token)).data;
  const finalRows = Array.isArray(stock) ? stock : (stock.items || stock.data || []);
  const materialFinal = finalRows.find(row => row.product_id === material.id || row.productId === material.id);
  const finishedFinal = finalRows.find(row => row.product_id === finished.id || row.productId === finished.id);
  ok(!!materialFinal && near(materialFinal.quantity, 6) && near(materialFinal.reserved_quantity, 0),
    "material consumption reduces stock to six and releases reservation");
  ok(!!finishedFinal && near(finishedFinal.quantity, 2) && near(finishedFinal.average_unit_cost, 200),
    "finished goods receive two units at KES 200 weighted-average cost");
  const finishedProduct = (await req("GET", `/products/${finished.id}`, undefined, token)).data;
  ok(near(finishedProduct.stockQuantity ?? finishedProduct.stock_quantity, 2) &&
     near(finishedProduct.costPrice ?? finishedProduct.cost_price, 200),
    "legacy product quantity and cost stay aligned with warehouse stock");

  const journals = (await req("GET", "/accounting/journals", undefined, token)).data;
  const materialJournal = journals.find(row => row.source_type === "manufacturing_material_consumption" && row.source_id === order.id);
  const finishedJournal = journals.find(row => row.source_type === "manufacturing_finished_goods" && row.source_id === order.id);
  ok(!!materialJournal && near(materialJournal.total_debits, 400) && near(materialJournal.total_credits, 400),
    "material consumption posts a balanced KES 400 WIP journal");
  ok(!!finishedJournal && near(finishedJournal.total_debits, 400) && near(finishedJournal.total_credits, 400),
    "finished goods post a balanced KES 400 inventory/WIP journal");

  const movementResult = (await req("GET", "/inventory/movements?limit=250", undefined, token)).data;
  const movements = Array.isArray(movementResult) ? movementResult : (movementResult.items || movementResult.data || []);
  const materialMovements = movements.filter(row => row.product_id === material.id);
  const finishedMovements = movements.filter(row => row.product_id === finished.id);
  ok(near(materialMovements.reduce((sum, row) => sum + Number(row.quantity), 0), 6),
    "material stock movements reconcile to six units");
  ok(near(finishedMovements.reduce((sum, row) => sum + Number(row.quantity), 0), 2),
    "finished-goods stock movements reconcile to two units");

  await req("POST", `/manufacturing/orders/${order.id}/complete`, {}, token, [409]);
  ok(true, "duplicate production completion rejected without duplicate journals");

  const after = (await req("GET", "/inventory/reconciliation", undefined, token)).data;
  ok(after.stockLedger.mismatchCount <= baseline.stockLedger.mismatchCount &&
     after.legacyProductQuantities.mismatchCount <= baseline.legacyProductQuantities.mismatchCount,
    "manufacturing does not increase stock-ledger or legacy quantity mismatches");
  ok(near(after.valuation.variance, baseline.valuation.variance, 0.01),
    "manufacturing material-to-finished-goods transfer preserves baseline inventory valuation variance");

  console.log(JSON.stringify({ ok: true, checksPassed: checks.length, checks, orderId: order.id,
    producedQuantity: Number(completed.produced_quantity), materialRemaining: Number(materialFinal.quantity),
    finishedGoodsQuantity: Number(finishedFinal.quantity), finishedGoodsAverageCost: Number(finishedFinal.average_unit_cost),
    materialJournalId: materialJournal.id, finishedGoodsJournalId: finishedJournal.id,
    valuationVarianceBefore: baseline.valuation.variance, valuationVarianceAfter: after.valuation.variance }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
