import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateSupplierBillDto, RecordSupplierBillPaymentDto } from './dto/supplier-bill.dto.js';

@Injectable()
export class SupplierBillsService {
  constructor(private readonly db: DatabaseService, private readonly memberships: MembershipsService, private readonly audit: AuditService) {}
  private companyFor(user: AuthenticatedUser) {
    return user.companyId ? this.memberships.getMembershipForCompany(user.userId,user.companyId) : this.memberships.getMembership(user.userId);
  }
  async list(user: AuthenticatedUser) {
    const {companyId}=await this.companyFor(user);
    return (await this.db.query(
      `SELECT b.id,b.company_id,b.supplier_id,s.name AS supplier_name,b.purchase_order_id,b.bill_number,b.supplier_invoice_number,b.bill_date,b.due_date,b.status,b.currency,b.subtotal,b.tax_amount,b.total,b.paid_amount,(b.total-b.paid_amount) AS balance,b.notes,b.created_at,b.updated_at,COUNT(i.id)::int AS item_count
       FROM supplier_bills b JOIN suppliers s ON s.id=b.supplier_id AND s.company_id=b.company_id
       LEFT JOIN supplier_bill_items i ON i.supplier_bill_id=b.id AND i.company_id=b.company_id
       WHERE b.company_id=$1 GROUP BY b.id,s.name ORDER BY b.due_date NULLS LAST,b.created_at DESC`,[companyId])).rows;
  }
  async getById(user: AuthenticatedUser,id:string) {
    const {companyId}=await this.companyFor(user);
    const result=await this.db.query(`SELECT b.*,s.name AS supplier_name,(b.total-b.paid_amount) AS balance FROM supplier_bills b JOIN suppliers s ON s.id=b.supplier_id AND s.company_id=b.company_id WHERE b.company_id=$1 AND b.id=$2`,[companyId,id]);
    if(!result.rows[0])throw new NotFoundException('Supplier bill not found.');
    const [items,payments]=await Promise.all([
      this.db.query('SELECT * FROM supplier_bill_items WHERE company_id=$1 AND supplier_bill_id=$2 ORDER BY created_at,id',[companyId,id]),
      this.db.query('SELECT * FROM supplier_bill_payments WHERE company_id=$1 AND supplier_bill_id=$2 ORDER BY payment_date DESC,created_at DESC',[companyId,id])
    ]);
    return {...result.rows[0],items:items.rows,payments:payments.rows};
  }
  async create(user:AuthenticatedUser,dto:CreateSupplierBillDto) {
    const membership=await this.companyFor(user);const companyId=membership.companyId;
    const id=await this.db.transaction(async client=>{
      const supplier=await client.query<{id:string}>("SELECT id FROM suppliers WHERE id=$1 AND company_id=$2 AND is_active=true AND status='active'",[dto.supplierId,companyId]);
      if(!supplier.rows[0])throw new NotFoundException('Active supplier not found in this company.');
      if(dto.purchaseOrderId){
        const po=await client.query<{supplier_id:string;status:string}>('SELECT supplier_id,status FROM purchase_orders WHERE id=$1 AND company_id=$2 FOR SHARE',[dto.purchaseOrderId,companyId]);
        if(!po.rows[0])throw new NotFoundException('Purchase order not found in this company.');
        if(po.rows[0].supplier_id!==dto.supplierId)throw new BadRequestException('Bill supplier must match the purchase order supplier.');
        if(['draft','cancelled'].includes(po.rows[0].status))throw new BadRequestException('A bill cannot be linked to a draft or cancelled purchase order.');
      }
      const year=new Date().getFullYear();
      const seq=await client.query<{next_number:number}>(`INSERT INTO supplier_bill_sequences(company_id,bill_year,next_number) VALUES($1,$2,1) ON CONFLICT(company_id,bill_year) DO UPDATE SET next_number=supplier_bill_sequences.next_number+1 RETURNING next_number`,[companyId,year]);
      const number=`BILL-${year}-${String(seq.rows[0].next_number).padStart(5,'0')}`;
      let subtotal=0,taxAmount=0;
      const lines:Array<{description:string;qty:number;cost:number;rate:number;sub:number;tax:number;total:number;poItemId:string|null}>=[];
      for(const item of dto.items){
        if(item.purchaseOrderItemId){
          if(!dto.purchaseOrderId)throw new BadRequestException('A purchase order item requires a linked purchase order.');
          const poItem=await client.query<{id:string;product_name:string;unit_cost:string|number;purchase_order_id:string}>('SELECT id,product_name,unit_cost,purchase_order_id FROM purchase_order_items WHERE id=$1 AND company_id=$2 AND purchase_order_id=$3',[item.purchaseOrderItemId,companyId,dto.purchaseOrderId]);
          if(!poItem.rows[0])throw new NotFoundException('Linked purchase order item not found.');
        }
        const sub=Math.round(item.quantity*item.unitCost*100)/100;
        const tax=Math.round(sub*(item.taxRate??0))/100;
        subtotal+=sub;taxAmount+=tax;
        lines.push({description:item.description.trim(),qty:item.quantity,cost:item.unitCost,rate:item.taxRate??0,sub,tax,total:sub+tax,poItemId:item.purchaseOrderItemId??null});
      }
      const inserted=await client.query<{id:string}>(`INSERT INTO supplier_bills(company_id,supplier_id,purchase_order_id,bill_number,supplier_invoice_number,bill_date,due_date,status,subtotal,tax_amount,total,notes,created_by)
        VALUES($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7::date,'open',$8,$9,$10,$11,$12) RETURNING id`,
        [companyId,dto.supplierId,dto.purchaseOrderId??null,number,dto.supplierInvoiceNumber??null,dto.billDate??null,dto.dueDate??null,subtotal,taxAmount,subtotal+taxAmount,dto.notes??null,user.userId]);
      for(const line of lines)await client.query(`INSERT INTO supplier_bill_items(company_id,supplier_bill_id,purchase_order_item_id,description,quantity,unit_cost,tax_rate,line_subtotal,tax_amount,line_total)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[companyId,inserted.rows[0].id,line.poItemId,line.description,line.qty,line.cost,line.rate,line.sub,line.tax,line.total]);
      return inserted.rows[0].id;
    });
    await this.audit.log({userId:user.userId,companyId,branchId:null,action:'supplier_bill.create',entityType:'supplier_bill',entityId:id,oldValues:null,newValues:{supplierId:dto.supplierId,purchaseOrderId:dto.purchaseOrderId??null},ipAddress:null});
    return this.getById(user,id);
  }
  async recordPayment(user:AuthenticatedUser,id:string,dto:RecordSupplierBillPaymentDto) {
    const m=await this.companyFor(user);
    await this.db.transaction(async client=>{
      const res=await client.query<{total:string|number;paid_amount:string|number;status:string}>('SELECT total,paid_amount,status FROM supplier_bills WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,m.companyId]);
      const bill=res.rows[0];if(!bill)throw new NotFoundException('Supplier bill not found.');
      if(bill.status==='void')throw new BadRequestException('A void bill cannot receive payments.');
      const balance=Number(bill.total)-Number(bill.paid_amount);
      if(dto.amount>balance+0.000001)throw new BadRequestException('Payment exceeds the outstanding bill balance.');
      await client.query(`INSERT INTO supplier_bill_payments(company_id,supplier_bill_id,amount,payment_date,method,reference,notes,created_by)
       VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8)`,[m.companyId,id,dto.amount,dto.paymentDate??null,dto.method,dto.reference??null,dto.notes??null,user.userId]);
      const paid=Number(bill.paid_amount)+dto.amount;
      const status=paid+0.000001>=Number(bill.total)?'paid':'partially_paid';
      await client.query('UPDATE supplier_bills SET paid_amount=$1,status=$2,updated_at=NOW() WHERE id=$3 AND company_id=$4',[paid,status,id,m.companyId]);
    });
    await this.audit.log({userId:user.userId,companyId:m.companyId,branchId:null,action:'supplier_bill.payment',entityType:'supplier_bill',entityId:id,oldValues:null,newValues:{amount:dto.amount,method:dto.method},ipAddress:null});
    return this.getById(user,id);
  }
}
