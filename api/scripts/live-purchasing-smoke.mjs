const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const stamp = Date.now();
const email = `omega-e2e-${stamp}@example.com`;
const password = `E2e-${crypto.randomUUID()}-9!`;
const companyName = `Omega E2E ${stamp}`;
const checks = [];
async function req(method,path,body,token,expected=[200,201]) {
 const r=await fetch(base+path,{method,headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await r.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!expected.includes(r.status))throw Error(`${method} ${path}: expected ${expected}, got ${r.status}: ${JSON.stringify(data).slice(0,350)}`);
 return {status:r.status,data};
}
function ok(v,m){if(!v)throw Error(m);checks.push(m)}
try {
 const h=await req("GET","/health");ok(h.data?.status==="ok"&&h.data?.database==="connected","health/database");
 const reg=(await req("POST","/auth/register",{email,password,fullName:"Omega E2E Runner",phone:"+254700000000",companyName},null,[201])).data;
 ok(!!reg.userId&&!!reg.companyId,"register temporary tenant");
 const login=(await req("POST","/auth/login",{email,password})).data;const token=login.accessToken;
 ok(!!token&&!!login.refreshToken,"login and token pair");
 const me=(await req("GET","/auth/me",undefined,token)).data;ok(me.userId===reg.userId&&me.companyId===reg.companyId,"authenticated /me and tenant identity");
 const supplier=(await req("POST","/suppliers",{name:`E2E Supplier ${stamp}`,email:`supplier-${stamp}@example.com`},token,[201])).data;ok(!!supplier.id,"create tenant supplier");
 const product=(await req("POST","/products",{sku:`E2E-${stamp}`,name:`E2E Stock ${stamp}`,sellingPrice:150,costPrice:100,stockQuantity:0,reorderLevel:0,isService:false,isActive:true},token,[201])).data;ok(!!product.id,"create physical product");
 const warehouse=(await req("POST","/inventory/warehouses",{code:`E${String(stamp).slice(-8)}`,name:`E2E Warehouse ${stamp}`,location:"Automated test",capacity:0,isActive:true},token,[201])).data;ok(!!warehouse.id,"create active warehouse");
 const po=(await req("POST","/purchase-orders",{supplierId:supplier.id,expectedDate:new Date(Date.now()+86400000).toISOString().slice(0,10),notes:"Automated authenticated integration test",items:[{productId:product.id,quantity:5,unitCost:100,taxRate:16}]},token,[201])).data;
 const line=po.items?.[0];ok(!!po.id&&!!line?.id,"create purchase order and item");
 const ordered=(await req("PATCH",`/purchase-orders/${po.id}/status`,{status:"ordered"},token)).data;ok(ordered.status==="ordered","draft to ordered");
 const partial=(await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:2}],reference:`E2E-${stamp}`},token,[201])).data;
 ok(partial.status==="partially_received"&&Number(partial.items?.[0]?.received_quantity)===2,"partial receipt state");
 await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:4}]},token,[400]);ok(true,"over-receipt rejected");
 const stock=(await req("GET",`/inventory/stock?warehouseId=${warehouse.id}`,undefined,token)).data;
 const stockRows=Array.isArray(stock)?stock:(stock.items||stock.data||[]);
 ok(stockRows.some(x=>(x.product_id||x.productId)===product.id&&Number(x.quantity)===2),"stock ledger quantity after receipt");
 const bill=(await req("POST","/supplier-bills",{supplierId:supplier.id,purchaseOrderId:po.id,supplierInvoiceNumber:`SUP-${stamp}`,billDate:new Date().toISOString().slice(0,10),items:[{purchaseOrderItemId:line.id,description:line.product_name,quantity:2,unitCost:100,taxRate:16}]},token,[201])).data;
 ok(!!bill.id&&Number(bill.total)===232&&Number(bill.balance)===232,"supplier bill total/tax/balance");
 await req("POST","/supplier-bills",{supplierId:supplier.id,purchaseOrderId:po.id,items:[{purchaseOrderItemId:line.id,description:line.product_name,quantity:1,unitCost:100,taxRate:16}]},token,[400]);ok(true,"duplicate billing quantity rejected");
 const p1=(await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:100,method:"mpesa",reference:`E2E-PAY-${stamp}`},token,[201])).data;
 ok(p1.status==="partially_paid"&&Number(p1.balance)===132,"partial payment balance");
 await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:133,method:"bank_transfer"},token,[400]);ok(true,"overpayment rejected");
 const p2=(await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:132,method:"bank_transfer",reference:`E2E-FINAL-${stamp}`},token,[201])).data;
 ok(p2.status==="paid"&&Number(p2.balance)===0,"bill fully paid");
 const received=(await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:3}],reference:`E2E-FINAL-${stamp}`},token,[201])).data;
 ok(received.status==="received"&&Number(received.items?.[0]?.received_quantity)===5,"second receipt completes order");
 console.log(JSON.stringify({ok:true,email,userId:reg.userId,companyId:reg.companyId,supplierId:supplier.id,productId:product.id,warehouseId:warehouse.id,purchaseOrderId:po.id,supplierBillId:bill.id,checks},null,2));
} catch(e) { console.error(JSON.stringify({ok:false,email,error:String(e),checks},null,2));process.exitCode=1; }
