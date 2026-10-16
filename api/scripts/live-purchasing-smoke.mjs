import { neonTestLogin } from "./neon-test-auth.mjs";
const base = (process.env.OMEGA_API_URL || "https://omega-solutions-api.onrender.com/api").replace(/\/$/, "");
const stamp = Date.now();
const checks = [];
async function req(method,path,body,token,expected=[200,201]) {
 const r=await fetch(base+path,{method,headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await r.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!expected.includes(r.status))throw Error(`${method} ${path}: expected ${expected}, got ${r.status}: ${JSON.stringify(data).slice(0,350)}`);
 return {status:r.status,data};
}
function ok(v,m){if(!v)throw Error(m);checks.push(m)}
try {
 let h=null,lastHealthError=null;
 for(let attempt=0;attempt<12;attempt++){try{h=await req("GET","/health");if(h.data?.status==="ok"&&h.data?.database==="connected")break;h=null}catch(e){lastHealthError=e}await new Promise(resolve=>setTimeout(resolve,5000))}
 if(!h)throw Error(`API health/database did not recover: ${String(lastHealthError||"unexpected health response")}`);
 ok(h.data?.status==="ok"&&h.data?.database==="connected","health/database");
 const login = await neonTestLogin(base, { slot: "A", companyName: `Omega E2E ${stamp}` });
 const token = login.token;
 ok(!!token&&!!login.refreshToken,"verified Neon Auth identity exchanged for Omega tokens");
 const me=(await req("GET","/auth/me",undefined,token)).data;ok(me.userId===login.user.userId&&me.companyId===login.user.companyId,"authenticated /me and tenant identity");
 const supplier=(await req("POST","/suppliers",{name:`E2E Supplier ${stamp}`,email:`supplier-${stamp}@example.com`},token,[201])).data;ok(!!supplier.id,"create tenant supplier");
 const product=(await req("POST","/products",{sku:`E2E-${stamp}`,name:`E2E Stock ${stamp}`,sellingPrice:150,costPrice:100,stockQuantity:0,reorderLevel:0,isService:false,isActive:true},token,[201])).data;ok(!!product.id,"create physical product");
 const warehouse=(await req("POST","/inventory/warehouses",{code:`E${String(stamp).slice(-8)}`,name:`E2E Warehouse ${stamp}`,location:"Automated test",capacity:0,isActive:true},token,[201])).data;ok(!!warehouse.id,"create active warehouse");
 const po=(await req("POST","/purchase-orders",{supplierId:supplier.id,expectedDate:new Date(Date.now()+86400000).toISOString().slice(0,10),notes:"Automated authenticated integration test",items:[{productId:product.id,quantity:5,unitCost:100,taxRate:16}]},token,[201])).data;
 const line=po.items?.[0];ok(!!po.id&&!!line?.id,"create purchase order and item");
 const ordered=(await req("PATCH",`/purchase-orders/${po.id}/status`,{status:"ordered"},token)).data;ok(ordered.status==="ordered","draft to ordered");
 const partial=(await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:2}],reference:`E2E-${stamp}`},token,[201])).data;
 ok(partial.status==="partially_received"&&Number(partial.items?.[0]?.received_quantity)===2,"partial receipt state");
 const partialJournals=(await req("GET","/accounting/journals",undefined,token)).data;
 const partialReceiptJournal=partialJournals.find(x=>x.source_type==="purchase_order_receipt"&&x.source_id===partial.receiptId);
 ok(!!partial.receiptId&&!!partialReceiptJournal&&partialReceiptJournal.description.includes(po.order_number)&&Math.abs(Number(partialReceiptJournal.total_debits)-200)<0.005&&Math.abs(Number(partialReceiptJournal.total_credits)-200)<0.005,"partial receipt has unique receipt ID and balanced KES 200 inventory/GRNI journal");
 const partialReceiptDetail=(await req("GET",`/accounting/journals/${partialReceiptJournal.id}`,undefined,token)).data;
 ok(partialReceiptDetail.lines.some(x=>x.account_code==="1200"&&Math.abs(Number(x.debit)-200)<0.005),"receipt journal debits inventory");
 ok(partialReceiptDetail.lines.some(x=>/goods received/i.test(x.description||"")&&Math.abs(Number(x.credit)-200)<0.005),"receipt journal credits GRNI");
 await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:4}]},token,[400]);ok(true,"over-receipt rejected");
 const stock=(await req("GET",`/inventory/stock?warehouseId=${warehouse.id}`,undefined,token)).data;
 const stockRows=Array.isArray(stock)?stock:(stock.items||stock.data||[]);
 ok(stockRows.some(x=>(x.product_id||x.productId)===product.id&&Number(x.quantity)===2),"stock ledger quantity after receipt");
 const bill=(await req("POST","/supplier-bills",{supplierId:supplier.id,purchaseOrderId:po.id,supplierInvoiceNumber:`SUP-${stamp}`,billDate:new Date().toISOString().slice(0,10),items:[{purchaseOrderItemId:line.id,description:line.product_name,quantity:2,unitCost:100,taxRate:16}]},token,[201])).data;
 ok(!!bill.id&&Number(bill.total)===232&&Number(bill.balance)===232,"supplier bill total/tax/balance");
 const billDetailBeforePayment=(await req("GET","/supplier-bills/"+bill.id,undefined,token)).data;
 ok(billDetailBeforePayment.id===bill.id&&billDetailBeforePayment.items?.length===1&&billDetailBeforePayment.payments?.length===0,"bill detail returns lines and empty payment history");
 const billJournals=(await req("GET","/accounting/journals",undefined,token)).data;
 const billJournal=billJournals.find(x=>x.source_type==="supplier_bill"&&x.source_id===bill.id);
 ok(!!billJournal&&Number(billJournal.total_debits)===232&&Number(billJournal.total_credits)===232,"supplier bill posts balanced journal entry");
 const billJournalDetail=(await req("GET",`/accounting/journals/${billJournal.id}`,undefined,token)).data;
 ok(billJournalDetail.lines.some(x=>/clear goods received not yet invoiced/i.test(x.description||"")&&Math.abs(Number(x.debit)-200)<0.005)&&billJournalDetail.lines.some(x=>x.account_code==="1300"&&Math.abs(Number(x.debit)-32)<0.005)&&!billJournalDetail.lines.some(x=>x.account_code==="1200"&&Number(x.debit)>0),"supplier bill clears GRNI, posts input VAT, and does not debit inventory twice");
 await req("POST","/supplier-bills",{supplierId:supplier.id,purchaseOrderId:po.id,items:[{purchaseOrderItemId:line.id,description:line.product_name,quantity:1,unitCost:100,taxRate:16}]},token,[400]);ok(true,"duplicate billing quantity rejected");
 const p1=(await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:100,method:"mpesa",reference:`E2E-PAY-${stamp}`},token,[201])).data;
 ok(p1.status==="partially_paid"&&Number(p1.balance)===132,"partial payment balance");
 const billDetailAfterPartial=(await req("GET","/supplier-bills/"+bill.id,undefined,token)).data;
 ok(billDetailAfterPartial.payments?.length===1&&Math.abs(Number(billDetailAfterPartial.payments[0].amount)-100)<0.005,"bill detail records partial payment history");
 const paymentOneId=p1.payments?.[0]?.id;
 const journalsAfterPayment=(await req("GET","/accounting/journals",undefined,token)).data;
 const paymentJournal=journalsAfterPayment.find(x=>x.source_type==="supplier_bill_payment"&&x.source_id===paymentOneId);
 ok(!!paymentJournal&&Number(paymentJournal.total_debits)===100&&Number(paymentJournal.total_credits)===100,"partial payment posts balanced journal entry");
 await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:133,method:"bank_transfer"},token,[400]);ok(true,"overpayment rejected");
 const p2=(await req("POST",`/supplier-bills/${bill.id}/payments`,{amount:132,method:"bank_transfer",reference:`E2E-FINAL-${stamp}`},token,[201])).data;
 ok(p2.status==="paid"&&Number(p2.balance)===0,"bill fully paid");
 const billDetailAfterFull=(await req("GET","/supplier-bills/"+bill.id,undefined,token)).data;
 ok(billDetailAfterFull.payments?.length===2&&Number(billDetailAfterFull.payments[0].amount)+Number(billDetailAfterFull.payments[1].amount)===232&&Number(billDetailAfterFull.balance)===0,"bill detail shows complete payment history and zero balance");
 const accounts=(await req("GET","/accounting/accounts",undefined,token)).data;
 const apAccount=accounts.find(x=>x.system_code==="accounts_payable");
 ok(!!apAccount&&Number(apAccount.balance)===0,"accounts payable ledger clears after full payment");
 const reconciliation=(await req("GET","/accounting/reconciliation/payables",undefined,token)).data;
 ok(reconciliation.reconciled===true&&Number(reconciliation.controlAccountBalance)===0&&Number(reconciliation.supplierBillsBalance)===0&&Number(reconciliation.variance)===0,"payables reconciliation matches ledger and supplier bills");
 const finalJournals=(await req("GET","/accounting/journals",undefined,token)).data;
 ok(finalJournals.filter(x=>["supplier_bill","supplier_bill_payment"].includes(x.source_type)).every(x=>Math.abs(Number(x.total_debits)-Number(x.total_credits))<0.005),"all supplier bill/payment journal entries balance");
 const received=(await req("POST",`/purchase-orders/${po.id}/receive`,{warehouseId:warehouse.id,items:[{itemId:line.id,quantity:3}],reference:`E2E-FINAL-${stamp}`},token,[201])).data;
 ok(received.status==="received"&&Number(received.items?.[0]?.received_quantity)===5,"second receipt completes order");
 const finalReceiptJournals=(await req("GET","/accounting/journals",undefined,token)).data.filter(x=>x.source_type==="purchase_order_receipt"&&[partial.receiptId,received.receiptId].includes(x.source_id));
 ok(finalReceiptJournals.length===2&&finalReceiptJournals.every(x=>Math.abs(Number(x.total_debits)-Number(x.total_credits))<0.005)&&Math.abs(finalReceiptJournals.reduce((sum,x)=>sum+Number(x.total_debits),0)-500)<0.005,"both receipt journals balance and capitalize KES 500 total inventory");
 console.log(JSON.stringify({ok:true,email:login.email,userId:login.user.userId,companyId:login.user.companyId,supplierId:supplier.id,productId:product.id,warehouseId:warehouse.id,purchaseOrderId:po.id,supplierBillId:bill.id,checks},null,2));
} catch(e) { console.error(JSON.stringify({ok:false,error:String(e),checks},null,2));process.exitCode=1; }
