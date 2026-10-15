import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateBomDto, CreateProductionOrderDto } from './dto/manufacturing.dto.js';

@Injectable()
export class ManufacturingService {
 constructor(private readonly db:DatabaseService,private readonly memberships:MembershipsService,private readonly audit:AuditService){}
 private companyFor(user:AuthenticatedUser){return user.companyId?this.memberships.getMembershipForCompany(user.userId,user.companyId):this.memberships.getMembership(user.userId);}
 async listBoms(user:AuthenticatedUser){
  const {companyId}=await this.companyFor(user);
  return (await this.db.query(`SELECT b.id,b.company_id,b.code,b.name,b.product_id,p.name AS product_name,b.output_quantity,b.version,b.status,b.notes,b.created_at,b.updated_at,COUNT(bl.id)::int AS line_count
   FROM manufacturing_boms b JOIN products p ON p.id=b.product_id AND p.company_id=b.company_id
   LEFT JOIN manufacturing_bom_lines bl ON bl.bom_id=b.id AND bl.company_id=b.company_id
   WHERE b.company_id=$1 GROUP BY b.id,p.name ORDER BY b.updated_at DESC`,[companyId])).rows;
 }
 async getBom(user:AuthenticatedUser,id:string){
  const {companyId}=await this.companyFor(user);
  const result=await this.db.query(`SELECT b.id,b.company_id,b.code,b.name,b.product_id,p.name AS product_name,b.output_quantity,b.version,b.status,b.notes,b.created_at,b.updated_at
   FROM manufacturing_boms b JOIN products p ON p.id=b.product_id AND p.company_id=b.company_id WHERE b.company_id=$1 AND b.id=$2`,[companyId,id]);
  if(!result.rows[0])throw new NotFoundException('Bill of materials not found.');
  const lines=await this.db.query(`SELECT l.id,l.material_product_id,p.name AS material_name,p.sku,l.quantity,l.waste_percent,l.notes
   FROM manufacturing_bom_lines l JOIN products p ON p.id=l.material_product_id AND p.company_id=l.company_id
   WHERE l.company_id=$1 AND l.bom_id=$2 ORDER BY p.name`,[companyId,id]);
  return {...result.rows[0],lines:lines.rows};
 }
 async createBom(user:AuthenticatedUser,dto:CreateBomDto){
  const {companyId,branchId}=await this.companyFor(user);
  const code=dto.code.trim().toUpperCase(),name=dto.name.trim();
  if(!code||!name)throw new BadRequestException('BOM code and name are required.');
  if(new Set(dto.lines.map(x=>x.materialProductId)).size!==dto.lines.length)throw new BadRequestException('A material may only appear once in a BOM.');
  if(dto.lines.some(x=>x.materialProductId===dto.productId))throw new BadRequestException('The finished product cannot be a component of its own BOM.');
  let createdId:string;
  try{
   createdId=await this.db.transaction(async client=>{
    const ids=[dto.productId,...dto.lines.map(x=>x.materialProductId)];
    const products=await client.query<{id:string;is_service:boolean;name:string}>(`SELECT id,is_service,name FROM products WHERE company_id=$1 AND id=ANY($2::uuid[]) FOR SHARE`,[companyId,ids]);
    if(products.rows.length!==new Set(ids).size)throw new BadRequestException('The finished product or a material does not belong to the active company.');
    if(products.rows.some(p=>p.is_service))throw new BadRequestException('Service items cannot be used as manufactured products or stock materials.');
    const result=await client.query<{id:string}>(`INSERT INTO manufacturing_boms(company_id,code,name,product_id,output_quantity,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[companyId,code,name,dto.productId,dto.outputQuantity,dto.notes?.trim()||null,user.userId]);
    for(const line of dto.lines)await client.query(`INSERT INTO manufacturing_bom_lines(company_id,bom_id,material_product_id,quantity,waste_percent,notes)
     VALUES($1,$2,$3,$4,$5,$6)`,[companyId,result.rows[0].id,line.materialProductId,line.quantity,line.wastePercent??0,line.notes?.trim()||null]);
    return result.rows[0].id;
   });
  }catch(e){if((e as {code?:string}).code==='23505')throw new ConflictException('A BOM with this code already exists in this company.');throw e;}
  await this.audit.log({userId:user.userId,companyId,branchId,action:'manufacturing.bom.create',entityType:'manufacturing_bom',entityId:createdId,oldValues:null,newValues:{code,name,productId:dto.productId,lines:dto.lines.length},ipAddress:null});
  return this.getBom(user,createdId);
 }
 async listOrders(user:AuthenticatedUser){
  const {companyId}=await this.companyFor(user);
  return (await this.db.query(`SELECT o.id,o.company_id,o.order_number,o.bom_id,b.code AS bom_code,b.name AS bom_name,b.product_id,p.name AS product_name,o.warehouse_id,w.name AS warehouse_name,o.planned_quantity,o.produced_quantity,o.status,o.planned_start_date,o.planned_end_date,o.actual_start_at,o.completed_at,o.notes,o.created_at,o.updated_at
   FROM manufacturing_production_orders o JOIN manufacturing_boms b ON b.id=o.bom_id AND b.company_id=o.company_id
   JOIN products p ON p.id=b.product_id AND p.company_id=o.company_id JOIN warehouses w ON w.id=o.warehouse_id AND w.company_id=o.company_id
   WHERE o.company_id=$1 ORDER BY o.created_at DESC LIMIT 200`,[companyId])).rows;
 }
 async createOrder(user:AuthenticatedUser,dto:CreateProductionOrderDto){
  const {companyId,branchId}=await this.companyFor(user);
  if(dto.plannedStartDate&&dto.plannedEndDate&&dto.plannedEndDate<dto.plannedStartDate)throw new BadRequestException('Planned end date cannot be before start date.');
  const orderId=await this.db.transaction(async client=>{
   const bom=await client.query<{id:string;output_quantity:string|number;product_id:string}>(`SELECT id,output_quantity,product_id FROM manufacturing_boms WHERE company_id=$1 AND id=$2 AND status='active' FOR SHARE`,[companyId,dto.bomId]);
   if(!bom.rows[0])throw new NotFoundException('Active bill of materials not found.');
   const warehouse=await client.query(`SELECT id FROM warehouses WHERE company_id=$1 AND id=$2 AND is_active=true FOR SHARE`,[companyId,dto.warehouseId]);
   if(!warehouse.rows[0])throw new NotFoundException('Active warehouse not found in this company.');
   const nowYear=new Date().getFullYear();
   const seq=await client.query<{next_number:number}>(`INSERT INTO manufacturing_order_sequences(company_id,entry_year,next_number) VALUES($1,$2,1)
    ON CONFLICT(company_id,entry_year) DO UPDATE SET next_number=manufacturing_order_sequences.next_number+1 RETURNING next_number`,[companyId,nowYear]);
   const orderNumber=`MO-${nowYear}-${String(seq.rows[0].next_number).padStart(6,'0')}`;
   const created=await client.query<{id:string}>(`INSERT INTO manufacturing_production_orders(company_id,order_number,bom_id,warehouse_id,planned_quantity,planned_start_date,planned_end_date,notes,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[companyId,orderNumber,dto.bomId,dto.warehouseId,dto.plannedQuantity,dto.plannedStartDate??null,dto.plannedEndDate??null,dto.notes?.trim()||null,user.userId]);
   const lines=await client.query<{material_product_id:string;quantity:string|number;waste_percent:string|number}>(`SELECT material_product_id,quantity,waste_percent FROM manufacturing_bom_lines WHERE company_id=$1 AND bom_id=$2 ORDER BY id`,[companyId,dto.bomId]);
   if(!lines.rows.length)throw new BadRequestException('The selected BOM has no material lines.');
   for(const line of lines.rows){
    const required=Number(line.quantity)*dto.plannedQuantity/Number(bom.rows[0].output_quantity)*(1+Number(line.waste_percent)/100);
    await client.query(`INSERT INTO manufacturing_order_materials(company_id,production_order_id,material_product_id,required_quantity,unit_cost)
     SELECT $1,$2,p.id,$4,p.cost_price FROM products p WHERE p.company_id=$1 AND p.id=$3`,[companyId,created.rows[0].id,line.material_product_id,required]);
   }
   return created.rows[0].id;
  });
  await this.audit.log({userId:user.userId,companyId,branchId,action:'manufacturing.order.create',entityType:'manufacturing_production_order',entityId:orderId,oldValues:null,newValues:{bomId:dto.bomId,warehouseId:dto.warehouseId,plannedQuantity:dto.plannedQuantity},ipAddress:null});
  return (await this.db.query('SELECT * FROM manufacturing_production_orders WHERE company_id=$1 AND id=$2',[companyId,orderId])).rows[0];
 }

 async startOrder(user:AuthenticatedUser,id:string){
  const {companyId,branchId}=await this.companyFor(user);
  const result=await this.db.transaction(async client=>{
   const order=await client.query<{id:string;status:string;warehouse_id:string;planned_quantity:string|number;bom_id:string}>(`SELECT id,status,warehouse_id,planned_quantity,bom_id FROM manufacturing_production_orders WHERE company_id=$1 AND id=$2 FOR UPDATE`,[companyId,id]);
   if(!order.rows[0])throw new NotFoundException('Production order not found.');
   if(order.rows[0].status!=='planned')throw new ConflictException('Only planned production orders can be started.');
   const materials=await client.query<{material_product_id:string;required_quantity:string|number;reserved_quantity:string|number}>(`SELECT material_product_id,required_quantity,reserved_quantity FROM manufacturing_order_materials WHERE company_id=$1 AND production_order_id=$2 ORDER BY material_product_id FOR UPDATE`,[companyId,id]);
   if(!materials.rows.length)throw new BadRequestException('Production order has no material requirements.');
   for(const material of materials.rows){
    await client.query(`INSERT INTO inventory_stock_levels(company_id,warehouse_id,product_id,quantity,reserved_quantity,reorder_level) VALUES($1,$2,$3,0,0,0) ON CONFLICT(warehouse_id,product_id) DO NOTHING`,[companyId,order.rows[0].warehouse_id,material.material_product_id]);
    const reserved=await client.query<{id:string}>(`UPDATE inventory_stock_levels SET reserved_quantity=reserved_quantity+$1,updated_at=NOW() WHERE company_id=$2 AND warehouse_id=$3 AND product_id=$4 AND quantity-reserved_quantity >= $1 RETURNING id`,[material.required_quantity,companyId,order.rows[0].warehouse_id,material.material_product_id]);
    if(!reserved.rows[0])throw new BadRequestException('Insufficient available stock for material '+material.material_product_id+'; production was not started.');
    await client.query(`UPDATE manufacturing_order_materials SET reserved_quantity=required_quantity WHERE company_id=$1 AND production_order_id=$2 AND material_product_id=$3`,[companyId,id,material.material_product_id]);
   }
   await client.query(`UPDATE manufacturing_production_orders SET status='in_progress',actual_start_at=NOW(),material_reserved_at=NOW(),updated_at=NOW() WHERE company_id=$1 AND id=$2`,[companyId,id]);
   return (await client.query(`SELECT * FROM manufacturing_production_orders WHERE company_id=$1 AND id=$2`,[companyId,id])).rows[0];
  });
  await this.audit.log({userId:user.userId,companyId,branchId,action:'manufacturing.order.start',entityType:'manufacturing_production_order',entityId:id,oldValues:{status:'planned'},newValues:{status:'in_progress'},ipAddress:null});
  return result;
 }
 async completeOrder(user:AuthenticatedUser,id:string){
  const {companyId,branchId}=await this.companyFor(user);
  const result=await this.db.transaction(async client=>{
   const order=await client.query<{id:string;status:string;warehouse_id:string;planned_quantity:string|number;produced_quantity:string|number;bom_id:string;product_id:string;product_cost:string|number}>(`SELECT o.id,o.status,o.warehouse_id,o.planned_quantity,o.produced_quantity,o.bom_id,b.product_id,p.cost_price AS product_cost FROM manufacturing_production_orders o JOIN manufacturing_boms b ON b.id=o.bom_id AND b.company_id=o.company_id JOIN products p ON p.id=b.product_id AND p.company_id=o.company_id WHERE o.company_id=$1 AND o.id=$2 FOR UPDATE OF o`,[companyId,id]);
   if(!order.rows[0])throw new NotFoundException('Production order not found.');
   if(order.rows[0].status!=='in_progress')throw new ConflictException('Only in-progress production orders can be completed.');
   const materials=await client.query<{material_product_id:string;required_quantity:string|number;reserved_quantity:string|number;consumed_quantity:string|number;unit_cost:string|number}>(`SELECT material_product_id,required_quantity,reserved_quantity,consumed_quantity,unit_cost FROM manufacturing_order_materials WHERE company_id=$1 AND production_order_id=$2 ORDER BY material_product_id FOR UPDATE`,[companyId,id]);
   if(!materials.rows.length)throw new BadRequestException('Production order has no material requirements.');
   let totalMaterialCost=0;
   for(const material of materials.rows){
    const required=Number(material.required_quantity);
    if(Number(material.reserved_quantity)<required||Number(material.consumed_quantity)>0)throw new ConflictException('Material reservation state is inconsistent; completion was stopped.');
    const stock=await client.query<{quantity:string|number;reserved_quantity:string|number}>(`SELECT quantity,reserved_quantity FROM inventory_stock_levels WHERE company_id=$1 AND warehouse_id=$2 AND product_id=$3 FOR UPDATE`,[companyId,order.rows[0].warehouse_id,material.material_product_id]);
    if(!stock.rows[0]||Number(stock.rows[0].quantity)<required||Number(stock.rows[0].reserved_quantity)<required)throw new ConflictException('Reserved material stock no longer matches the production requirement.');
    await client.query(`UPDATE inventory_stock_levels SET quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=NOW() WHERE company_id=$2 AND warehouse_id=$3 AND product_id=$4`,[required,companyId,order.rows[0].warehouse_id,material.material_product_id]);
    await client.query(`INSERT INTO inventory_stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference,notes,created_by) VALUES($1,$2,$3,'issue',$4,$5,$6,$7,$8)`,[companyId,material.material_product_id,order.rows[0].warehouse_id,-required,material.unit_cost,'MO-'+id,'Material consumed by production order',user.userId]);
    await client.query(`UPDATE manufacturing_order_materials SET consumed_quantity=required_quantity,reserved_quantity=0,consumed_at=NOW() WHERE company_id=$1 AND production_order_id=$2 AND material_product_id=$3`,[companyId,id,material.material_product_id]);
    await client.query(`UPDATE products SET stock_quantity=COALESCE((SELECT SUM(quantity) FROM inventory_stock_levels WHERE company_id=$1 AND product_id=$2),0) WHERE company_id=$1 AND id=$2`,[companyId,material.material_product_id]);
    totalMaterialCost+=required*Number(material.unit_cost);
   }
   const finishedQuantity=Number(order.rows[0].planned_quantity);
   await client.query(`INSERT INTO inventory_stock_levels(company_id,warehouse_id,product_id,quantity,reserved_quantity,reorder_level) VALUES($1,$2,$3,0,0,0) ON CONFLICT(warehouse_id,product_id) DO NOTHING`,[companyId,order.rows[0].warehouse_id,order.rows[0].product_id]);
   await client.query(`UPDATE inventory_stock_levels SET quantity=quantity+$1,updated_at=NOW() WHERE company_id=$2 AND warehouse_id=$3 AND product_id=$4`,[finishedQuantity,companyId,order.rows[0].warehouse_id,order.rows[0].product_id]);
   const unitCost=finishedQuantity>0?totalMaterialCost/finishedQuantity:Number(order.rows[0].product_cost);
   await client.query(`INSERT INTO inventory_stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference,notes,created_by) VALUES($1,$2,$3,'receipt',$4,$5,$6,$7,$8)`,[companyId,order.rows[0].product_id,order.rows[0].warehouse_id,finishedQuantity,unitCost,'MO-'+id,'Finished goods received from production order',user.userId]);
   await client.query(`UPDATE products SET stock_quantity=COALESCE((SELECT SUM(quantity) FROM inventory_stock_levels WHERE company_id=$1 AND product_id=$2),0),cost_price=$3 WHERE company_id=$1 AND id=$2`,[companyId,order.rows[0].product_id,unitCost]);
   await client.query(`UPDATE manufacturing_production_orders SET status='completed',produced_quantity=$3,completed_at=NOW(),materials_consumed_at=NOW(),updated_at=NOW() WHERE company_id=$1 AND id=$2`,[companyId,id,finishedQuantity]);
   return (await client.query(`SELECT * FROM manufacturing_production_orders WHERE company_id=$1 AND id=$2`,[companyId,id])).rows[0];
  });
  await this.audit.log({userId:user.userId,companyId,branchId,action:'manufacturing.order.complete',entityType:'manufacturing_production_order',entityId:id,oldValues:{status:'in_progress'},newValues:{status:'completed',producedQuantity:result.produced_quantity},ipAddress:null});
  return result;
 }
}
